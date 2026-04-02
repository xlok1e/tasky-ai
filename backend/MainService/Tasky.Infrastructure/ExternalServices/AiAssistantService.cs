using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Application.Mappers;
using Tasky.Domain.Entities;
using Tasky.Domain.Enums;
using Tasky.Infrastructure.Persistence;

namespace Tasky.Infrastructure.ExternalServices
{
    public class GptunnelService : IAiAssistantService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly AppDbContext _db;
        private readonly IGoogleCalendarService _googleCalendar;
        private readonly IAnalyticsService _analyticsService;
        private readonly ILogger<GptunnelService> _logger;

        private const string ModelName = "gemini-2.5-flash";
        private const string HttpClientName = "gptunnel";
        private const string WhisperClientName = "whisper";
        private const int MaxHistoryMessages = 10; // 5 turns × 2 records each
        private const int TasksMaxCount = 25;

        private const int QueryTasksMaxDisplay = 15;

        public GptunnelService(IHttpClientFactory httpClientFactory, AppDbContext db, IGoogleCalendarService googleCalendar, IAnalyticsService analyticsService, ILogger<GptunnelService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _db = db;
            _googleCalendar = googleCalendar;
            _analyticsService = analyticsService;
            _logger = logger;
        }

        public async Task<AiChatResponse> ChatAsync(int userId, string message)
        {
            if (string.IsNullOrWhiteSpace(message))
                return new AiChatResponse { Reply = "Пожалуйста, введите сообщение." };

            var isGoogleConnected = await _googleCalendar.IsConnectedAsync(userId);
            var taskContext = await LoadUserTasksContextAsync(userId);
            var listsContext = await LoadUserListsContextAsync(userId);
            var systemPrompt = BuildSystemPrompt(isGoogleConnected, taskContext, listsContext);

            var history = await _db.AiConversationHistory
                .Where(h => h.UserId == userId)
                .OrderByDescending(h => h.CreatedAt)
                .Take(MaxHistoryMessages)
                .OrderBy(h => h.CreatedAt)
                .ToListAsync();

            var requestBody = new
            {
                model = ModelName,
                messages = BuildMessages(history, systemPrompt, message),
                useWalletBalance = true
            };

            var client = _httpClientFactory.CreateClient(HttpClientName);
            using var httpResponse = await client.PostAsJsonAsync("v1/chat/completions", requestBody);
            httpResponse.EnsureSuccessStatusCode();

            using var responseStream = await httpResponse.Content.ReadAsStreamAsync();
            using var responseDoc = await JsonDocument.ParseAsync(responseStream);

            var raw = responseDoc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "{}";

            try
            {
                var chatResponse = ParseResponse(raw);

                if (chatResponse.Intent == "sync_google" || chatResponse.Intent == "disconnect_google")
                    chatResponse = await HandleCalendarIntentAsync(userId, chatResponse.Intent, chatResponse.Reply, isGoogleConnected);
                else if (chatResponse.Intent == "query_tasks")
                    chatResponse = await ExecuteTaskQueryAsync(userId, chatResponse.PendingQuery ?? new PendingQueryDto(), chatResponse.Reply);
                else if (chatResponse.Intent == "get_statistics")
                    chatResponse = await ExecuteStatisticsAsync(userId, chatResponse.PendingQuery ?? new PendingQueryDto(), chatResponse.Reply);

                await SaveMessagesAsync(userId, message, chatResponse.Reply);
                return chatResponse;
            }
            catch (JsonException)
            {
                await SaveMessagesAsync(userId, message, raw);
                return new AiChatResponse { Reply = raw };
            }
        }

        private async Task<AiChatResponse> HandleCalendarIntentAsync(
            int userId,
            string intent,
            string reply,
            bool isGoogleConnected)
        {
            if (intent == "disconnect_google" && isGoogleConnected)
            {
                var state = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == userId);
                if (state is not null) _db.GoogleSyncStates.Remove(state);

                var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
                if (settings is not null) settings.UseBuiltinCalendar = true;

                await _db.SaveChangesAsync();
            }

            return new AiChatResponse { Reply = reply, Intent = intent };
        }

        private static string BuildSystemPrompt(bool isGoogleConnected, string taskContext, string listsContext)
        {
            var localNow = DateTime.UtcNow.AddHours(3);
            var today    = localNow.Date;
            var tomorrow = today.AddDays(1);
            var weekEnd  = today.AddDays(6);

            var weekCalendar = BuildWeekCalendar(today);
            var dateResolution = BuildDateResolutionTable(today);

            return $$"""
            You are TaskyAI — a personal task planner assistant. Respond ONLY with valid JSON (no markdown fences).

            CONTEXT:
            - Current date/time: {{localNow:yyyy-MM-dd HH:mm}} GMT+3 ({{GetRussianDayOfWeek(localNow.DayOfWeek)}})
            - Google Calendar: {{(isGoogleConnected ? "connected" : "not connected")}}
            - User's lists: {{listsContext}}
            - Upcoming tasks (internal reference only, ID:name@MM-dd HH:mm): {{taskContext}}

            DATE RESOLUTION — CRITICAL: when user says a relative day name, use EXACTLY this date, never calculate:
            {{dateResolution}}

            Full week reference: {{weekCalendar}}

            OUTPUT FORMAT (always this exact structure):
            {"reply":"<Russian text>","intent":<null|"create_task"|"update_task"|"query_tasks"|"get_statistics"|"sync_google"|"disconnect_google">,"pendingTask":<object|null>,"pendingUpdate":<object|null>,"pendingQuery":<object|null>}

            pendingTask schema:  {"title":"","description":null,"startAt":null,"endAt":null,"isAllDay":false,"priority":"Low","listName":null}
            pendingUpdate schema: {"taskId":0,"title":null,"description":null,"startAt":null,"endAt":null,"isAllDay":null,"status":null,"listName":null}
            pendingQuery schema:  {"dateFrom":null,"dateTo":null,"listName":null,"priority":null,"status":null}

            === INTENT RULES ===

            [intent = null] Plain conversation:
            - Answer ONLY the user's exact question, concisely in Russian.
            - DO NOT include any task lists, task data, upcoming events, or unsolicited information.
            - Example: if user asks about Google Calendar → reply only about Google Calendar status, nothing else.
            - pendingTask=null, pendingUpdate=null, pendingQuery=null.

            [intent = "create_task"] User wants to add a new task:
            - pendingTask MUST be a non-null object. NEVER set pendingTask to null for this intent.
            - reply MUST summarize what you understood: task name, date/time (or "весь день" if no time given), list if mentioned. End with "Верно?"
              Example: «Создать задачу «Созвон» на 27 марта в 18:00 в список «Работа». Верно?»
            - startAt/endAt: ISO 8601 UTC (convert from GMT+3 by subtracting 3 hours).
            - isAllDay=true ONLY when user gives a date with NO clock time ("сегодня", "завтра", "в понедельник"). Do NOT invent a time.
            - isAllDay=false ONLY when user explicitly states a clock time ("в 18:00", "at 3pm").
            - isAllDay=true → startAt = midnight of that day in GMT+3 converted to UTC; endAt = null.
            - isAllDay=false → endAt = startAt + 1 hour if user did not specify end time.
            - priority: "Low" by default unless user says otherwise ("высокий", "срочно" → "High").
            - listName: exact name from Lists above, or null.
            - reply MUST contain ONLY the confirmation question. Do NOT mention Google Calendar, do NOT add any extra comments.

            [intent = "update_task"] User wants to change an existing task:
            - pendingUpdate MUST be a non-null object. NEVER set pendingUpdate to null for this intent.
            - Find task by FUZZY name match: accept typos, partial names, different word forms/case.
            - If no close match found → intent=null, ask user which task they mean.
            - If 2+ equally close matches → intent=null, list candidates by name, ask to clarify.
            - reply MUST echo: task name as found, what changes will be made. End with "Подтверждаете?"
              Example: «Перенести задачу «Созвон» на 28 марта в 15:00. Подтверждаете?»
            - Set ONLY changed fields; all other fields = null.
            - status values: "Completed" | "InProgress" | null.
            - listName: exact name from Lists above if user wants to move task to another list, otherwise null.

            [Undo / revert last confirmed change] User says "верни как было", "отмени изменение", "передумал", "откати", "верни обратно", etc. after a CONFIRMED update:
            - Look at the conversation history to find the last confirmed update (the previous pendingUpdate values that were confirmed).
            - Create a NEW intent="update_task" with pendingUpdate that reverts the fields to their PREVIOUS values (before that update).
            - If the task was previously isAllDay=true and was changed to a specific time → revert: isAllDay=true, startAt=midnight of that date UTC, endAt=null.
            - If the task previously had no time (isAllDay=true) and was given a time → revert to isAllDay=true.
            - reply MUST describe what will be reverted. End with "Подтверждаете?"
              Example: «Вернуть задачу «Созвон» на весь день 28 марта (убрать время). Подтверждаете?»
            - NEVER just say "Я отменяю изменение" as plain text — always produce a pendingUpdate for the user to confirm.

            [Delete task request]:
            - ALWAYS refuse. reply = «К сожалению, я не могу удалить задачу в целях безопасности. Удалить задачу можно вручную в приложении.»
            - intent=null, pendingTask=null, pendingUpdate=null, pendingQuery=null.

            [intent = "query_tasks"] User asks to see/list tasks:
            - pendingQuery MUST be a non-null object. NEVER set pendingQuery to null for this intent.
            - reply = ONLY a short header line, e.g. «Ваши задачи на сегодня:». Do NOT list tasks — the system appends them automatically.
            - Preset date ranges (GMT+3, no timezone suffix):
              today:    "{{today:yyyy-MM-dd}}T00:00:00" .. "{{today:yyyy-MM-dd}}T23:59:59"
              tomorrow: "{{tomorrow:yyyy-MM-dd}}T00:00:00" .. "{{tomorrow:yyyy-MM-dd}}T23:59:59"
              week:     "{{today:yyyy-MM-dd}}T00:00:00" .. "{{weekEnd:yyyy-MM-dd}}T23:59:59"
            - listName: exact name from Lists or null. status: "Completed"|"InProgress"|null (null = all).

            [intent = "get_statistics"] User asks for statistics, analytics, productivity report, or summary of completed work:
            - pendingQuery MUST be a non-null object. NEVER set pendingQuery to null for this intent.
            - reply = ONLY a short header, e.g. «Статистика за неделю:». Do NOT include statistics data — the system generates and appends it automatically.
            - If user does NOT specify a period, default to the last 7 days:
              dateFrom: "{{today.AddDays(-6):yyyy-MM-dd}}T00:00:00", dateTo: "{{today:yyyy-MM-dd}}T23:59:59"
            - Supported periods (GMT+3, no timezone suffix):
              today:    dateFrom="{{today:yyyy-MM-dd}}T00:00:00", dateTo="{{today:yyyy-MM-dd}}T23:59:59"
              week:     dateFrom="{{today.AddDays(-6):yyyy-MM-dd}}T00:00:00", dateTo="{{today:yyyy-MM-dd}}T23:59:59"
              month:    dateFrom="{{today.AddDays(-29):yyyy-MM-dd}}T00:00:00", dateTo="{{today:yyyy-MM-dd}}T23:59:59"
              year:     dateFrom="{{today.AddDays(-364):yyyy-MM-dd}}T00:00:00", dateTo="{{today:yyyy-MM-dd}}T23:59:59"
            - User may also specify exact dates, e.g. "с 1 марта по 15 марта" → set dateFrom/dateTo accordingly.
            - Keywords triggering this intent: "статистика", "аналитика", "продуктивность", "сколько задач выполнил", "отчёт", "итоги", "сводка".

            [intent = "sync_google" / "disconnect_google"]: handle Google Calendar connection requests.

            === ABSOLUTE RULES ===
            1. NEVER say "I added", "I created", "I changed" — always PROPOSE and wait for user confirmation.
            2. "reply" field: ONLY human-readable Russian text. NEVER include raw data, IDs, tab-separated values, database records, or internal context.
            3. The tasks context above is for YOUR INTERNAL REFERENCE ONLY — never reproduce it in replies unless the user explicitly asked to list tasks (query_tasks intent).
            4. Always reply in Russian. Be concise and answer only what was asked.
            5. When intent = create_task or update_task, the corresponding pending object is MANDATORY — if you cannot fill it, use intent=null and ask for clarification instead.
            6. When intent = create_task or update_task: reply contains ONLY the confirmation question — no Google Calendar status, no extra advice, nothing else.
            7. NEVER respond to "верни как было" / "отмени изменение" / "передумал" / "откати" with plain text. Always produce a new pendingUpdate (intent="update_task") that reverts the previously confirmed change based on conversation history.
            """;
        }

        private static IEnumerable<object> BuildMessages(
            IEnumerable<AiConversationHistory> history,
            string systemPrompt,
            string newMessage)
        {
            yield return new { role = "system", content = systemPrompt };

            foreach (var entry in history)
            {
                var role = entry.Role == "model" ? "assistant" : entry.Role;
                yield return new { role, content = entry.Content };
            }

            yield return new { role = "user", content = newMessage };
        }

        private static string BuildDateResolutionTable(DateTime today)
        {
            // Find the nearest future (or today) occurrence of each weekday
            var russianNames = new[]
            {
                ("понедельник", "пн", DayOfWeek.Monday),
                ("вторник",     "вт", DayOfWeek.Tuesday),
                ("среду",       "ср", DayOfWeek.Wednesday),
                ("четверг",     "чт", DayOfWeek.Thursday),
                ("пятницу",     "пт", DayOfWeek.Friday),
                ("субботу",     "сб", DayOfWeek.Saturday),
                ("воскресенье", "вс", DayOfWeek.Sunday),
            };

            var sb = new StringBuilder();
            sb.AppendLine($"сегодня/today = {today:yyyy-MM-dd}, завтра/tomorrow = {today.AddDays(1):yyyy-MM-dd}, послезавтра = {today.AddDays(2):yyyy-MM-dd}");

            foreach (var (longName, shortName, dow) in russianNames)
            {
                var daysUntil = ((int)dow - (int)today.DayOfWeek + 7) % 7;
                // If today is that weekday, "в X" means next week
                if (daysUntil == 0) daysUntil = 7;
                var targetDate = today.AddDays(daysUntil);
                sb.AppendLine($"в {longName} / {shortName} = {targetDate:yyyy-MM-dd}");
            }

            return sb.ToString().TrimEnd();
        }

        private static string BuildWeekCalendar(DateTime today)
        {
            // Monday of current week
            var daysFromMonday = ((int)today.DayOfWeek + 6) % 7;
            var thisMonday = today.AddDays(-daysFromMonday);

            var sb = new StringBuilder();
            var russianDays = new[] { "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс" };

            sb.Append("This week: ");
            for (var i = 0; i < 7; i++)
            {
                var date = thisMonday.AddDays(i);
                var marker = date == today ? " (сегодня)" : "";
                sb.Append($"{russianDays[i]}={date:yyyy-MM-dd}{marker}");
                if (i < 6) sb.Append(", ");
            }

            sb.Append(" | Next week: ");
            var nextMonday = thisMonday.AddDays(7);
            for (var i = 0; i < 7; i++)
            {
                var date = nextMonday.AddDays(i);
                sb.Append($"{russianDays[i]}={date:yyyy-MM-dd}");
                if (i < 6) sb.Append(", ");
            }

            return sb.ToString();
        }

        private static string GetRussianDayOfWeek(DayOfWeek dow) => dow switch
        {
            DayOfWeek.Monday => "понедельник",
            DayOfWeek.Tuesday => "вторник",
            DayOfWeek.Wednesday => "среда",
            DayOfWeek.Thursday => "четверг",
            DayOfWeek.Friday => "пятница",
            DayOfWeek.Saturday => "суббота",
            DayOfWeek.Sunday => "воскресенье",
            _ => ""
        };

        private static AiChatResponse ParseResponse(string raw)
        {
            var json = raw.Trim();
            if (json.StartsWith("```"))
            {
                json = string.Join("\n", json.Split('\n').Skip(1).SkipLast(1));
            }
            json = json.Trim();

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var reply = root.TryGetProperty("reply", out var replyEl)
                ? replyEl.GetString() ?? "Не удалось получить ответ."
                : "Не удалось получить ответ.";

            reply = SanitizeReply(reply);

            var intent = root.TryGetProperty("intent", out var intentEl) && intentEl.ValueKind != JsonValueKind.Null
                ? intentEl.GetString()
                : null;

            PendingTaskDto? pendingTask = null;
            if (root.TryGetProperty("pendingTask", out var ptEl) && ptEl.ValueKind == JsonValueKind.Object)
                pendingTask = ParsePendingTask(ptEl);

            PendingUpdateDto? pendingUpdate = null;
            if (root.TryGetProperty("pendingUpdate", out var puEl) && puEl.ValueKind == JsonValueKind.Object)
                pendingUpdate = ParsePendingUpdate(puEl);

            PendingQueryDto? pendingQuery = null;
            if (root.TryGetProperty("pendingQuery", out var pqEl) && pqEl.ValueKind == JsonValueKind.Object)
                pendingQuery = ParsePendingQuery(pqEl);

            // Infer intent from pending objects when LLM omits or forgets to set it
            if (pendingTask != null && !string.Equals(intent, "create_task", StringComparison.OrdinalIgnoreCase))
                intent = "create_task";
            if (pendingUpdate != null && !string.Equals(intent, "update_task", StringComparison.OrdinalIgnoreCase))
                intent = "update_task";
            if (pendingQuery != null
                && !string.Equals(intent, "query_tasks", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(intent, "get_statistics", StringComparison.OrdinalIgnoreCase))
                intent = "query_tasks";

            // Fallback: intent says create/update but the corresponding object is missing
            if (string.Equals(intent, "create_task", StringComparison.OrdinalIgnoreCase) && pendingTask == null)
            {
                reply += "\n\nНе удалось распознать задачу. Попробуйте сформулировать запрос иначе.";
                intent = null;
            }
            if (string.Equals(intent, "update_task", StringComparison.OrdinalIgnoreCase) && pendingUpdate == null)
            {
                reply += "\n\nНе удалось распознать изменения задачи. Попробуйте сформулировать запрос иначе.";
                intent = null;
            }
            if (string.Equals(intent, "get_statistics", StringComparison.OrdinalIgnoreCase) && pendingQuery == null)
            {
             new PendingQueryDto();
                intent = "get_statistics";
            }

            return new AiChatResponse
            {
                Reply = reply,
                Intent = intent,
                PendingTask = pendingTask,
                PendingUpdate = pendingUpdate,
                PendingQuery = pendingQuery
            };
        }

        private static string SanitizeReply(string reply)
        {
            if (string.IsNullOrWhiteSpace(reply)) return reply;

            var lines = reply.Split('\n');
            var cleanLines = lines.Where(line =>
            {
                var trimmed = line.TrimStart();
                // Строки с двумя и более подряд идущими табами — признак raw DB данных
                if (trimmed.Contains("\t\t")) return false;
                // Строки вида "число TAB число" — raw ID строки из БД
                if (System.Text.RegularExpressions.Regex.IsMatch(trimmed, @"^\d+\t\d+"))
                    return false;
                return true;
            });

            return string.Join('\n', cleanLines).Trim();
        }

        private static PendingTaskDto ParsePendingTask(JsonElement el) => new()
        {
            Title = el.GetStringOrEmpty("title"),
            Description = el.GetStringOrNull("description"),
            StartAt = el.GetDateOrNull("startAt"),
            EndAt = el.GetDateOrNull("endAt"),
            IsAllDay = el.GetBoolOrDefault("isAllDay"),
            Priority = el.GetStringOrEmpty("priority") is { Length: > 0 } p ? p : "Low",
            ListName = el.GetStringOrNull("listName")
        };

        private static PendingUpdateDto ParsePendingUpdate(JsonElement el) => new()
        {
            TaskId = el.TryGetProperty("taskId", out var idEl) ? idEl.GetInt32() : 0,
            Title = el.GetStringOrNull("title"),
            Description = el.GetStringOrNull("description"),
            StartAt = el.GetDateOrNull("startAt"),
            EndAt = el.GetDateOrNull("endAt"),
            IsAllDay = el.TryGetProperty("isAllDay", out var alEl) && alEl.ValueKind != JsonValueKind.Null
                ? alEl.GetBoolean()
                : null,
            Status = el.GetStringOrNull("status") is { } s
                ? Enum.TryParse<TaskCompletionStatus>(s, ignoreCase: true, out var st) ? st : null
                : null,
            ListName = el.GetStringOrNull("listName")
        };



        private static PendingQueryDto ParsePendingQuery(JsonElement el) => new()
        {
            DateFrom = el.GetLocalDateOrNull("dateFrom"),
            DateTo = el.GetLocalDateOrNull("dateTo"),
            ListName = el.GetStringOrNull("listName"),
            Priority = el.GetStringOrNull("priority"),
            Status = el.GetStringOrNull("status")
        };

        private async Task<AiChatResponse> ExecuteTaskQueryAsync(int userId, PendingQueryDto query, string aiHeader)
        {
            var q = _db.Tasks
                .Include(t => t.List)
                .Where(t => t.UserId == userId);

            // Status filter: null = все статусы
            if (query.Status == "Completed")
                q = q.Where(t => t.Status == TaskCompletionStatus.Completed);
            else if (query.Status == "InProgress")
                q = q.Where(t => t.Status == TaskCompletionStatus.InProgress);

            // Date range: даты из AI в GMT+3 — конвертируем в UTC вычитая 3 часа
            if (query.DateFrom.HasValue || query.DateTo.HasValue)
            {
                var dateFromUtc = query.DateFrom.HasValue
                    ? DateTime.SpecifyKind(query.DateFrom.Value.AddHours(-3), DateTimeKind.Utc)
                    : (DateTime?)null;
                var dateToUtc = query.DateTo.HasValue
                    ? DateTime.SpecifyKind(query.DateTo.Value.AddHours(-3), DateTimeKind.Utc)
                    : (DateTime?)null;

                q = q.Where(t => t.StartAt != null);
                if (dateFromUtc.HasValue)
                    q = q.Where(t => t.StartAt >= dateFromUtc);
                if (dateToUtc.HasValue)
                    q = q.Where(t => t.StartAt <= dateToUtc);
            }

            // List filter: ищем список по названию
            if (!string.IsNullOrEmpty(query.ListName))
            {
                var matchingListId = await ResolveListIdAsync(userId, query.ListName);

                if (matchingListId is null)
                    return new AiChatResponse
                    {
                        Reply = $"Список «{query.ListName}» не найден.",
                        Intent = "query_tasks"
                    };

                q = q.Where(t => t.ListId == matchingListId);
            }

            // Priority filter
            if (!string.IsNullOrEmpty(query.Priority)
                && Enum.TryParse<TaskPriority>(query.Priority, ignoreCase: true, out var priority))
                q = q.Where(t => t.Priority == priority);

            var total = await q.CountAsync();

            if (total == 0)
                return new AiChatResponse
                {
                    Reply = "По вашему запросу задач не найдено.",
                    Intent = "query_tasks"
                };

            var tasks = await q
                .OrderBy(t => t.StartAt == null ? 1 : 0)
                .ThenBy(t => t.StartAt)
                .ThenByDescending(t => t.CreatedAt)
                .Take(QueryTasksMaxDisplay)
                .Select(t => new
                {
                    t.Title,
                    t.StartAt,
                    t.IsAllDay,
                    ListName = t.List != null ? t.List.Name : (string?)null
                })
                .ToListAsync();

            var taskLines = tasks.Select(t =>
            {
                var parts = new List<string> { $"• {t.Title}" };

                if (t.StartAt.HasValue)
                {
                    var localTime = t.StartAt.Value.AddHours(3);
                    parts.Add(t.IsAllDay
                        ? localTime.ToString("dd.MM.yyyy")
                        : localTime.ToString("dd.MM.yyyy HH:mm"));
                }

                if (!string.IsNullOrEmpty(t.ListName))
                    parts.Add($"[{t.ListName}]");

                return string.Join(" — ", parts);
            });

            var sb = new StringBuilder();
            sb.AppendLine(aiHeader);
            sb.AppendLine();
            sb.AppendJoin("\n", taskLines);

            if (total > QueryTasksMaxDisplay)
            {
                sb.AppendLine();
                sb.AppendLine();
                sb.Append($"И ещё {total - QueryTasksMaxDisplay}. Посмотреть все можно в веб-приложении TaskyAI.");
            }

            return new AiChatResponse
            {
                Reply = sb.ToString().Trim(),
                Intent = "query_tasks"
            };
        }

        private async Task<AiChatResponse> ExecuteStatisticsAsync(int userId, PendingQueryDto query, string aiHeader)
        {
            var localNow = DateTime.UtcNow.AddHours(3);

            var dateFromLocal = query.DateFrom ?? localNow.Date.AddDays(-6);
            var dateToLocal = query.DateTo ?? localNow.Date.AddHours(23).AddMinutes(59).AddSeconds(59);

            if (dateToLocal.Hour == 0 && dateToLocal.Minute == 0 && dateToLocal.Second == 0)
                dateToLocal = dateToLocal.AddHours(23).AddMinutes(59).AddSeconds(59);

            var startDateUtc = DateTime.SpecifyKind(dateFromLocal.AddHours(-3), DateTimeKind.Utc);
            var endDateUtc = DateTime.SpecifyKind(dateToLocal.AddHours(-3), DateTimeKind.Utc);

            var request = new TaskAnalyticsRequest
            {
                StartDate = startDateUtc,
                EndDate = endDateUtc
            };

            var analytics = await _analyticsService.GetAnalyticsAsync(userId, request);

            if (analytics.TotalTasks == 0)
            {
                return new AiChatResponse
                {
                    Reply = $"{aiHeader}\n\nЗа этот период задач не найдено.",
                    Intent = "get_statistics"
                };
            }

            var periodDays = (endDateUtc - startDateUtc).TotalDays;

            var reply = new StringBuilder();
            reply.AppendLine(aiHeader);
            reply.AppendLine();
            reply.AppendLine($"📋 Всего задач: {analytics.TotalTasks}");
            reply.AppendLine($"✅ Выполнено: {analytics.CompletedTasks}");

            if (analytics.TotalTasks > 0 && analytics.CompletedTasks > 0)
            {
                var completionRate = (int)Math.Round((double)analytics.CompletedTasks / analytics.TotalTasks * 100);
                reply.AppendLine($"📈 Процент выполнения: {completionRate}%");
            }

            if (analytics.TotalHoursSpent > 0)
            {
                reply.AppendLine($"⏱ Затрачено времени: {FormatHours(analytics.TotalHoursSpent)}");
                reply.AppendLine($"⏳ Среднее на задачу: {FormatHours(analytics.AveragePerTask)}");
            }

            if (analytics.MostProductivePeriod != "Нет данных")
                reply.AppendLine($"🏆 Самый продуктивный период: {analytics.MostProductivePeriod}");

            if (analytics.PieChartData.Count > 0)
            {
                reply.AppendLine();
                reply.AppendLine("📂 По спискам:");
                foreach (var pie in analytics.PieChartData.OrderByDescending(p => p.TaskCount).Take(5))
                    reply.AppendLine($"  • {pie.ListName}: {pie.TaskCount} (выполнено: {pie.CompletedCount})");
            }

            return new AiChatResponse
            {
                Reply = reply.ToString().Trim(),
                Intent = "get_statistics"
            };
        }

        private static string FormatHours(double hours)
        {
            if (hours < 1)
                return $"{(int)Math.Round(hours * 60)} мин.";
            var h = (int)hours;
            var m = (int)Math.Round((hours - h) * 60);
            return m > 0 ? $"{h} ч. {m} мин." : $"{h} ч.";
        }

        public async Task<int> ConfirmTaskAsync(int userId, PendingTaskDto pending)
        {
            if (!Enum.TryParse<TaskPriority>(pending.Priority, ignoreCase: true, out var priority))
                priority = TaskPriority.Low;

            DateTime? startAt;
            DateTime? endAt;

            if (pending.IsAllDay)
            {
                // AI sends midnight GMT+3 as UTC (e.g. 2026-03-25T21:00:00Z = midnight 2026-03-26 GMT+3).
                // Convert to GMT+3 to get the correct local date, then back to UTC midnight GMT+3.
                if (pending.StartAt.HasValue)
                {
                    var localDate = pending.StartAt.Value.AddHours(3).Date;   // midnight GMT+3 as plain DateTime
                    startAt = DateTime.SpecifyKind(localDate.AddHours(-3), DateTimeKind.Utc); // back to UTC
                }
                else
                {
                    startAt = null;
                }
                endAt = startAt.HasValue ? startAt.Value.AddDays(1) : null;
            }
            else
            {
                startAt = pending.StartAt;
                endAt = pending.EndAt ?? startAt?.AddMinutes(60);
            }

            var listId = await ResolveListIdAsync(userId, pending.ListName);

            var task = new TaskItem
            {
                UserId = userId,
                Title = pending.Title,
                Description = pending.Description,
                Priority = priority,
                Status = TaskCompletionStatus.InProgress,
                IsAllDay = pending.IsAllDay,
                StartAt = startAt,
                EndAt = endAt,
                ListId = listId,
                CreatedAt = DateTime.UtcNow
            };

            _db.Tasks.Add(task);
            await _db.SaveChangesAsync();

            var googleState = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == userId);
            if (googleState is not null)
            {
                try
                {
                    await _googleCalendar.RefreshTokenIfNeededAsync(googleState);
                    task.GoogleEventId = await _googleCalendar.CreateEventAsync(googleState, task);
                    await _db.SaveChangesAsync();
                }
                catch
                {
                    // синхронизация с Google Calendar не критична
                }
            }

            return task.Id;
        }

        public async Task<TaskResponse> ConfirmUpdateAsync(int userId, PendingUpdateDto pending)
        {
            var task = await _db.Tasks
                .Include(t => t.List)
                .FirstOrDefaultAsync(t => t.Id == pending.TaskId && t.UserId == userId)
                ?? throw new KeyNotFoundException($"Задача #{pending.TaskId} не найдена.");

            if (!string.IsNullOrWhiteSpace(pending.Title))
                task.Title = pending.Title.Trim();

            if (pending.Description is not null)
                task.Description = pending.Description.Trim();

            if (pending.StartAt.HasValue) task.StartAt = pending.StartAt;
            if (pending.EndAt.HasValue) task.EndAt = pending.EndAt;
            if (pending.IsAllDay.HasValue) task.IsAllDay = pending.IsAllDay.Value;

            if (pending.Status.HasValue)
            {
                var wasCompleted = task.Status == TaskCompletionStatus.Completed;
                task.Status = pending.Status.Value;

                if (!wasCompleted && task.Status == TaskCompletionStatus.Completed)
                    task.CompletedAt = DateTime.UtcNow;
                else if (wasCompleted && task.Status != TaskCompletionStatus.Completed)
                    task.CompletedAt = null;
            }

            if (!string.IsNullOrWhiteSpace(pending.ListName))
            {
                var listId = await ResolveListIdAsync(userId, pending.ListName);
                if (listId is null)
                    throw new KeyNotFoundException($"Список «{pending.ListName}» не найден.");
                task.ListId = listId;
            }

            await _db.SaveChangesAsync();

            if (!string.IsNullOrEmpty(task.GoogleEventId))
            {
                var googleState = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == userId);
                if (googleState is not null)
                {
                    try
                    {
                        await _googleCalendar.RefreshTokenIfNeededAsync(googleState);
                        await _googleCalendar.UpdateEventAsync(googleState, task.GoogleEventId, task);
                    }
                    catch
                    {
                        // синхронизация с Google Calendar не критична
                    }
                }
            }

            return task.ToResponse();
        }

        public async Task<bool> ConfirmDeleteAsync(int userId, int taskId)
        {
            var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
            if (task is null) return false;

            if (!string.IsNullOrEmpty(task.GoogleEventId))
            {
                var googleState = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == userId);
                if (googleState is not null)
                {
                    try
                    {
                        await _googleCalendar.RefreshTokenIfNeededAsync(googleState);
                        await _googleCalendar.DeleteEventAsync(googleState, task.GoogleEventId);
                    }
                    catch
                    {
                        // синхронизация с Google Calendar не критична
                    }
                }
            }

            _db.Tasks.Remove(task);
            await _db.SaveChangesAsync();
            return true;
        }

        private async Task<int?> ResolveListIdAsync(int userId, string? listName)
        {
            if (string.IsNullOrWhiteSpace(listName)) return null;

            var lists = await _db.Lists
                .Where(l => l.UserId == userId)
                .Select(l => new { l.Id, Name = l.Name })
                .ToListAsync();

            var searchLower = listName.ToLower();

            // 1. Exact match (case-insensitive)
            var match = lists.FirstOrDefault(l => l.Name.ToLower() == searchLower);
            if (match is not null) return match.Id;

            // 2. User's phrase contains the list name: "рабочий список" → "Рабочий"
            match = lists.FirstOrDefault(l => searchLower.Contains(l.Name.ToLower()));
            if (match is not null) return match.Id;

            // 3. List name contains user's word: "рабочий" → "Рабочий проект"
            match = lists.FirstOrDefault(l => l.Name.ToLower().Contains(searchLower));
            return match?.Id;
        }

        private async Task<string> LoadUserListsContextAsync(int userId)
        {
            var names = await _db.Lists
                .Where(l => l.UserId == userId)
                .Select(l => l.Name)
                .ToListAsync();

            return names.Count == 0 ? "(нет)" : string.Join(", ", names.Select(n => $"«{n}»"));
        }

        private async Task<string> LoadUserTasksContextAsync(int userId)
        {
            var localToday = DateTime.UtcNow.AddHours(3).Date;

            // Начало сегодня GMT+3 → UTC
            var lowerBound = DateTime.SpecifyKind(localToday.AddHours(-3), DateTimeKind.Utc);

            // Конец воскресенья следующей недели GMT+3 → UTC (exclusive <)
            // DayOfWeek: Sunday=0 … Saturday=6
            var daysToNextSunday = ((7 - (int)localToday.DayOfWeek) % 7) + 7;
            var upperBound = DateTime.SpecifyKind(
                localToday.AddDays(daysToNextSunday + 1).AddHours(-3), DateTimeKind.Utc);

            var tasks = await _db.Tasks
                .Where(t => t.UserId == userId
                    && t.Status == TaskCompletionStatus.InProgress
                    && t.StartAt != null
                    && t.StartAt >= lowerBound
                    && t.StartAt < upperBound)
                .OrderBy(t => t.StartAt)
                .Take(TasksMaxCount)
                .Select(t => new { t.Id, t.Title, t.StartAt })
                .ToListAsync();

            if (tasks.Count == 0)
                return "(нет)";

            return string.Join(";", tasks.Select(t =>
                $"{t.Id}:{t.Title}@{t.StartAt!.Value.AddHours(3):MM-dd HH:mm}"));
        }

        private async Task SaveMessagesAsync(int userId, string userMsg, string assistantMsg)
        {
            var now = DateTime.UtcNow;
            _db.AiConversationHistory.AddRange(
                new AiConversationHistory { UserId = userId, Role = "user",  Content = userMsg, CreatedAt = now },
                new AiConversationHistory { UserId = userId, Role = "model", Content = assistantMsg, CreatedAt = now.AddMilliseconds(1) }
            );
            await _db.SaveChangesAsync();
        }

        public async Task<string> TranscribeAudioAsync(Stream audioStream, string fileName)
        {
            if (audioStream == null || (audioStream.CanSeek && audioStream.Length == 0))
                return string.Empty;

            try
            {
                using var form = new MultipartFormDataContent();

                var streamContent = new StreamContent(audioStream);
                var mimeType = fileName.EndsWith(".oga", StringComparison.OrdinalIgnoreCase) ? "audio/ogg" : "audio/ogg";
                streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);

                form.Add(streamContent, "file", fileName);
                form.Add(new StringContent("whisper-large-v3"), "model");
                form.Add(new StringContent("ru"), "language");

                var client = _httpClientFactory.CreateClient(WhisperClientName);
                using var response = await client.PostAsync("v1/audio/transcriptions", form);

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Whisper API returned {StatusCode}: {Body}", response.StatusCode, errorBody);
                    return string.Empty;
                }

                using var responseStream = await response.Content.ReadAsStreamAsync();
                using var doc = await JsonDocument.ParseAsync(responseStream);

                var text = doc.RootElement.TryGetProperty("text", out var textEl)
                    ? textEl.GetString() ?? string.Empty
                    : string.Empty;

                return text.Trim();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transcribing audio file {FileName}", fileName);
                return string.Empty;
            }
        }

        public Task SaveConfirmationToHistoryAsync(int userId, string userAction, string resultMessage)
            => SaveMessagesAsync(userId, userAction, resultMessage);

        public async Task<AiConversationHistoryListResponse> GetHistoryAsync(int userId, int page, int limit)
        {
            var query = _db.AiConversationHistory
                .Where(h => h.UserId == userId)
                .OrderBy(h => h.CreatedAt);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalCount / (double)limit);

            var messages = await query
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(h => new AiConversationHistoryResponse
                {
                    Role = h.Role,
                    Content = h.Content,
                    CreatedAt = h.CreatedAt
                })
                .ToListAsync();

            return new AiConversationHistoryListResponse
            {
                Messages = messages,
                TotalCount = totalCount,
                Page = page,
                Limit = limit,
                TotalPages = totalPages
            };
        }
    }

    internal static class JsonElementExtensions
    {
        public static string GetStringOrEmpty(this JsonElement el, string key) =>
            el.TryGetProperty(key, out var v) ? v.GetString() ?? string.Empty : string.Empty;

        public static string? GetStringOrNull(this JsonElement el, string key) =>
            el.TryGetProperty(key, out var v) && v.ValueKind != JsonValueKind.Null
                ? v.GetString()
                : null;

        public static bool GetBoolOrDefault(this JsonElement el, string key) =>
            el.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.True;

        public static DateTime? GetDateOrNull(this JsonElement el, string key)
        {
            var s = el.GetStringOrNull(key);
            if (s is null) return null;

            if (s.Length == 10 && DateTime.TryParseExact(
                    s, "yyyy-MM-dd", null,
                    System.Globalization.DateTimeStyles.None,
                    out var dateOnly))
                return DateTime.SpecifyKind(dateOnly, DateTimeKind.Utc);

            return DateTime.TryParse(s, null,
                    System.Globalization.DateTimeStyles.RoundtripKind, out var dt)
                ? dt.ToUniversalTime()
                : null;
        }

        /// <summary>
        /// Парсит дату как локальное время (GMT+3) без конвертации в UTC.
        /// Конвертацию выполняет сервис явным вычитанием 3 часов.
        /// </summary>
        public static DateTime? GetLocalDateOrNull(this JsonElement el, string key)
        {
            var s = el.GetStringOrNull(key);
            if (s is null) return null;

            if (s.Length == 10 && DateTime.TryParseExact(
                    s, "yyyy-MM-dd", null,
                    System.Globalization.DateTimeStyles.None,
                    out var dateOnly))
                return DateTime.SpecifyKind(dateOnly, DateTimeKind.Unspecified);

            return DateTime.TryParse(s, null,
                    System.Globalization.DateTimeStyles.None,
                    out var dt)
                ? DateTime.SpecifyKind(dt, DateTimeKind.Unspecified)
                : null;
        }
    }
}

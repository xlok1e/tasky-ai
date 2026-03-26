using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
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

        private const string ModelName = "gemini-2.5-flash";
        private const string HttpClientName = "gptunnel";
        private const int MaxHistoryMessages = 5;
        private const int TasksMaxCount = 10;
        private const int TasksUpcomingDays = 14;

        private const int QueryTasksMaxDisplay = 15;

        public GptunnelService(IHttpClientFactory httpClientFactory, AppDbContext db, IGoogleCalendarService googleCalendar)
        {
            _httpClientFactory = httpClientFactory;
            _db = db;
            _googleCalendar = googleCalendar;
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

            return $$"""
            TaskyAI — task planner. DateTime: {{localNow:yyyy-MM-dd HH:mm}} GMT+3. Google Calendar: {{(isGoogleConnected ? "connected" : "not connected")}}.
            Lists: {{listsContext}}
            Tasks (format ID:name@MM-dd HH:mm): {{taskContext}}

            Reply ONLY with valid JSON, no markdown:
            {"reply":"...","intent":null|"create_task"|"update_task"|"query_tasks"|"sync_google"|"disconnect_google","pendingTask":{"title":"","description":null,"startAt":null,"endAt":null,"isAllDay":false,"priority":"Low","listName":null}|null,"pendingUpdate":{"taskId":0,"title":null,"description":null,"startAt":null,"endAt":null,"isAllDay":null,"status":null}|null,"pendingQuery":{"dateFrom":null,"dateTo":null,"listName":null,"priority":null,"status":null}|null}

            Rules:
            - intent=null: plain conversation, no action.
            - create_task: startAt/endAt=ISO8601 UTC(GMT+3-3h), isAllDay=true if no specific time, priority="Low" default, listName=exact name from Lists or null. reply=ask user to confirm (in Russian).
            - update_task: find task by name in context→use its ID. Not found/ambiguous→intent=null, ask clarification. Set ONLY changed fields(rest=null). status:"Completed"/"InProgress"/null. reply=describe changes+ask to confirm (in Russian).
            - Delete task: refuse — "К сожалению, я не могу удалить задачу в целях безопасности. Удалить можно вручную в приложении." intent=null.
            - query_tasks: reply=short header ONLY (task list appended by system). pendingQuery REQUIRED (never null). dateFrom/dateTo=GMT+3 no suffix, system converts to UTC.
              Preset dates: today="{{today:yyyy-MM-dd}}T00:00:00".."{{today:yyyy-MM-dd}}T23:59:59", tomorrow="{{tomorrow:yyyy-MM-dd}}T00:00:00".."{{tomorrow:yyyy-MM-dd}}T23:59:59", week="{{today:yyyy-MM-dd}}T00:00:00".."{{weekEnd:yyyy-MM-dd}}T23:59:59". listName=exact from Lists|null. status:"Completed"/"InProgress"/null(all).
            - Never say "I added/changed" — propose and wait for confirmation. ALWAYS reply to user in Russian, concisely.
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

        private static AiChatResponse ParseResponse(string raw)
        {
            var json = raw.Trim();
            if (json.StartsWith("```"))
            {
                json = string.Join("\n", json.Split('\n').Skip(1).SkipLast(1)).Trim();
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var reply = root.TryGetProperty("reply", out var replyEl)
                ? replyEl.GetString() ?? "Не удалось получить ответ."
                : "Не удалось получить ответ.";

            var intent = root.TryGetProperty("intent", out var intentEl) && intentEl.ValueKind != JsonValueKind.Null
                ? intentEl.GetString()
                : null;

            PendingTaskDto? pendingTask = null;
            if (intent == "create_task"
                && root.TryGetProperty("pendingTask", out var ptEl)
                && ptEl.ValueKind == JsonValueKind.Object)
                pendingTask = ParsePendingTask(ptEl);

            PendingUpdateDto? pendingUpdate = null;
            if (intent == "update_task"
                && root.TryGetProperty("pendingUpdate", out var puEl)
                && puEl.ValueKind == JsonValueKind.Object)
                pendingUpdate = ParsePendingUpdate(puEl);



            PendingQueryDto? pendingQuery = null;
            if (intent == "query_tasks"
                && root.TryGetProperty("pendingQuery", out var pqEl)
                && pqEl.ValueKind == JsonValueKind.Object)
                pendingQuery = ParsePendingQuery(pqEl);

            return new AiChatResponse
            {
                Reply = reply,
                Intent = intent,
                PendingTask = pendingTask,
                PendingUpdate = pendingUpdate,
                PendingQuery = pendingQuery
            };
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
                : null
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
                sb.Append($"...и ещё {total - QueryTasksMaxDisplay}. Посмотреть все можно в соответствующих списках.");
            }

            return new AiChatResponse
            {
                Reply = sb.ToString().Trim(),
                Intent = "query_tasks"
            };
        }

        public async Task<int> ConfirmTaskAsync(int userId, PendingTaskDto pending)
        {
            if (!Enum.TryParse<TaskPriority>(pending.Priority, ignoreCase: true, out var priority))
                priority = TaskPriority.Low;

            DateTime? startAt;
            DateTime? endAt;

            if (pending.IsAllDay)
            {
                startAt = pending.StartAt.HasValue
                    ? DateTime.SpecifyKind(pending.StartAt.Value.Date, DateTimeKind.Utc)
                    : null;
                endAt = null;
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
            var upcomingCutoff = DateTime.UtcNow.AddDays(TasksUpcomingDays);

            var tasks = await _db.Tasks
                .Where(t => t.UserId == userId
                    && t.Status == TaskCompletionStatus.InProgress
                    && t.StartAt != null
                    && t.StartAt <= upcomingCutoff)
                .OrderBy(t => t.StartAt)
                .Take(TasksMaxCount)
                .Select(t => new { t.Id, t.Title, t.StartAt })
                .ToListAsync();

            if (tasks.Count == 0)
                return "(нет)";

            return string.Join(";", tasks.Select(t =>
                $"{t.Id}:{t.Title}@{t.StartAt!.Value:MM-dd HH:mm}"));
        }

        private async Task SaveMessagesAsync(int userId, string userMsg, string assistantMsg)
        {
            var now = DateTime.UtcNow;
            _db.AiConversationHistory.AddRange(
                new AiConversationHistory { UserId = userId, Role = "user",  Content = userMsg,      CreatedAt = now },
                new AiConversationHistory { UserId = userId, Role = "model", Content = assistantMsg, CreatedAt = now }
            );
            await _db.SaveChangesAsync();
        }

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

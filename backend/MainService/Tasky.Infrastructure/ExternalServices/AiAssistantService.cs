using System.Net.Http;
using System.Net.Http.Json;
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
        private const int MaxHistoryMessages = 20;

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
            var systemPrompt = BuildSystemPrompt(isGoogleConnected, taskContext);

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

        private static string BuildSystemPrompt(bool isGoogleConnected, string taskContext) => $$"""
            Ты TaskyAI — ИИ-планировщик задач.
            Текущая дата и время: {{DateTime.UtcNow:yyyy-MM-dd HH:mm}} UTC. Часовой пояс пользователя: GMT+3.
            Google Calendar: {{(isGoogleConnected ? "подключён" : "не подключён")}}.
            Задачи пользователя: {{taskContext}}

            ВСЕГДА отвечай строго в формате JSON (без markdown, без ```json):
            {
              "reply": "текст ответа пользователю",
              "intent": null | "create_task" | "update_task" | "delete_task" | "sync_google" | "disconnect_google",
              "pendingTask": null | {
                "title": "string",
                "description": "string | null",
                "startAt": "ISO8601 | null",
                "endAt": "ISO8601 | null",
                "isAllDay": true | false,
                "priority": "Low | Medium | High"
              },
              "pendingUpdate": null | {
                "taskId": 123,
                "title": "string | null",
                "description": "string | null",
                "startAt": "ISO8601 | null",
                "endAt": "ISO8601 | null",
                "isAllDay": true | false | null,
                "status": "InProgress | Completed | null"
              },
              "pendingDelete": null | {
                "taskId": 123,
                "taskTitle": "string"
              }
            }

            Правила:
            - startAt/endAt: ISO 8601. Только дата → "2026-03-20". С временем → "2026-03-20T17:00:00Z" (учитывай GMT+3 → UTC).
            - isAllDay = true если задача на весь день без конкретного времени.
            - priority: "Low" по умолчанию, если пользователь не указал.
            - Никогда не говори «я добавил/изменил/удалил» — только предлагай и жди подтверждения.
            - intent = null если это просто вопрос или разговор без действия.
            - Отвечай кратко и по-русски.
            """;

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

            PendingDeleteDto? pendingDelete = null;
            if (intent == "delete_task"
                && root.TryGetProperty("pendingDelete", out var pdEl)
                && pdEl.ValueKind == JsonValueKind.Object)
                pendingDelete = ParsePendingDelete(pdEl);

            return new AiChatResponse
            {
                Reply = reply,
                Intent = intent,
                PendingTask = pendingTask,
                PendingUpdate = pendingUpdate,
                PendingDelete = pendingDelete
            };
        }

        private static PendingTaskDto ParsePendingTask(JsonElement el) => new()
        {
            Title = el.GetStringOrEmpty("title"),
            Description = el.GetStringOrNull("description"),
            StartAt = el.GetDateOrNull("startAt"),
            EndAt = el.GetDateOrNull("endAt"),
            IsAllDay = el.GetBoolOrDefault("isAllDay"),
            Priority = el.GetStringOrEmpty("priority") is { Length: > 0 } p ? p : "Low"
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

        private static PendingDeleteDto ParsePendingDelete(JsonElement el) => new()
        {
            TaskId = el.TryGetProperty("taskId", out var idEl) ? idEl.GetInt32() : 0,
            TaskTitle = el.GetStringOrEmpty("taskTitle")
        };

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

        private async Task<string> LoadUserTasksContextAsync(int userId)
        {
            var tasks = await _db.Tasks
                .Where(t => t.UserId == userId && t.Status == TaskCompletionStatus.InProgress)
                .OrderByDescending(t => t.CreatedAt)
                .Take(30)
                .Select(t => new { t.Id, t.Title, t.StartAt })
                .ToListAsync();

            if (tasks.Count == 0)
                return "(задач нет)";

            return string.Join("\n", tasks.Select(t =>
                $"- ID:{t.Id} «{t.Title}»" + (t.StartAt.HasValue ? $" ({t.StartAt.Value:yyyy-MM-dd HH:mm})" : "")));
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
    }
}

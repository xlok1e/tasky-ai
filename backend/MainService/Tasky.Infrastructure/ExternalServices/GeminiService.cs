using System.Text;
using System.Text.Json;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Application.Mappers;
using Tasky.Domain.Entities;
using Tasky.Domain.Enums;
using Tasky.Infrastructure.Persistence;

namespace Tasky.Infrastructure.ExternalServices
{
    public class GeminiService : IAiAssistantService
    {
		private readonly Client _client;
		private readonly AppDbContext _db;
		private readonly IGoogleCalendarService _googleCalendar;

		private const string ModelName = "gemini-2.5-flash";
		private const int MaxHistoryMessage = 20;

		public static readonly Tool ProposeTask = new()
		{
			FunctionDeclarations =
			[
				new FunctionDeclaration
				{
					Name = "propose_task",
					Description = "Вызывается, когда пользователь предоставил достаточную информацию для создания задачи.",
					Parameters = new Schema
					{
						Type = "object",
						Properties = new Dictionary<string, Schema>
						{
							["title"] = new() {Type = "string", Description = "Название задачи"},
							["description"] = new() {Type = "string", Description = "Описание задачи (опционально)"},
							["start_at"] = new() { Type = "string", Description = "ISO 8601. Для задачи на весь день — только дата (2026-03-20). Для задачи с временем — дата и время (2026-03-20T17:00:00Z)" },
							["end_at"] = new() { Type = "string", Description = "ISO 8601 — время окончания, только если пользователь явно указал. Иначе пустая строка" },
							["is_all_day"] = new() { Type = "boolean", Description = "true если задача на весь день без конкретного времени, false если есть конкретное время" },
						},

						Required = ["title", "is_all_day"]
					}
				},
				new FunctionDeclaration
				{
					Name = "update_task",
					Description = "Вызывается, когда пользователь хочет изменить существующую задачу.",
					Parameters = new Schema
					{
						Type = "object",
						Properties = new Dictionary<string, Schema>
						{
							["task_id"] = new() { Type = "integer", Description = "ID задачи из списка задач пользователя" },
							["title"] = new() { Type = "string", Description = "Новое название задачи (если изменяется)" },
							["description"] = new() { Type = "string", Description = "Новое описание (если изменяется)" },
							["start_at"] = new() { Type = "string", Description = "ISO 8601 новое время начала (если изменяется)" },
							["end_at"] = new() { Type = "string", Description = "ISO 8601 новое время окончания (если изменяется)" },
							["is_all_day"] = new() { Type = "boolean", Description = "true если задача на весь день" },
							["status"] = new() { Type = "string", Description = "Статус задачи: InProgress или Completed" },
						},
						Required = ["task_id"]
					}
				},
				new FunctionDeclaration
				{
					Name = "delete_task",
					Description = "Вызывается, когда пользователь хочет удалить задачу.",
					Parameters = new Schema
					{
						Type = "object",
						Properties = new Dictionary<string, Schema>
						{
							["task_id"] = new() { Type = "integer", Description = "ID задачи из списка задач пользователя" },
							["task_title"] = new() { Type = "string", Description = "Название задачи для подтверждения" },
						},
						Required = ["task_id", "task_title"]
					}
				},
				new FunctionDeclaration
				{
					Name = "sync_google",
					Description = "Вызывается, когда пользователь хочет синхронизировать задачи с Google Calendar.",
					Parameters = new Schema { Type = "object", Properties = new Dictionary<string, Schema>() }
				},
				new FunctionDeclaration
				{
					Name = "disconnect_google",
					Description = "Вызывается, когда пользователь хочет отключить Google Calendar.",
					Parameters = new Schema { Type = "object", Properties = new Dictionary<string, Schema>() }
				},
			]
		};


		public GeminiService(IConfiguration config, AppDbContext db, IGoogleCalendarService googleCalendar)
		{
			_client = new Client(apiKey: config["Gemini:ApiKey"]
            ?? throw new InvalidOperationException("Gemini API key is not configured."));
			_db = db;
			_googleCalendar = googleCalendar;
		}

		public async Task<AiChatResponse> ChatAsync(int userId, string message)
		{
			if (string.IsNullOrWhiteSpace(message))
				return new AiChatResponse { Reply = "Пожалуйста, введите сообщение." };

			var isGoogleConnected = await _googleCalendar.IsConnectedAsync(userId);
			var userTasks = await LoadUserTasksContextAsync(userId);
			var geminiConfig = BuildConfig(isGoogleConnected, userTasks);

			var history = await _db.AiConversationHistory
				.Where(h => h.UserId == userId)
				.OrderByDescending(h => h.CreatedAt)
				.Take(MaxHistoryMessage)
				.OrderBy(h => h.CreatedAt)
				.ToListAsync();

			var contents = BuildContents(history, message);

			var response = await _client.Models.GenerateContentAsync(ModelName, contents, geminiConfig);
			var candidate = response?.Candidates?[0]?.Content;

			var fnPart = candidate?.Parts?.FirstOrDefault(p => p.FunctionCall is not null);
			if (fnPart is null)
			{
				var plainReply = candidate?.Parts?[0]?.Text ?? "Не удалось получить ответ.";
				await SaveMessagesAsync(userId, message, plainReply);
				return new AiChatResponse { Reply = plainReply };
			}

			var fnName = fnPart.FunctionCall!.Name;

			if (fnName == "sync_google" || fnName == "disconnect_google")
			{
				string immediateReply;
				if (fnName == "sync_google")
				{
					immediateReply = isGoogleConnected
						? "Синхронизация с Google Calendar запущена. Используй кнопку синхронизации."
						: "Google Calendar не подключён. Подключи его в настройках.";
				}
				else
				{
					immediateReply = "Отключение Google Calendar выполнено. Теперь используется встроенный календарь.";
					if (isGoogleConnected)
					{
						var state = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == userId);
						if (state is not null) _db.GoogleSyncStates.Remove(state);
						var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
						if (settings is not null) settings.UseBuiltinCalendar = true;
						await _db.SaveChangesAsync();
					}
				}

				await SaveMessagesAsync(userId, message, immediateReply);
				return new AiChatResponse { Reply = immediateReply, Intent = fnName };
			}

			var extendedContent = new List<Content>(contents)
			{
				candidate!,
				new()
				{
					Role = "user",
					Parts =
					[
						new Part
						{
							FunctionResponse = new FunctionResponse
							{
								Name = fnName,
								Response = new Dictionary<string, object> { ["success"] = true }
							}
						}
					]
				}
			};

			var response2 = await _client.Models.GenerateContentAsync(ModelName, extendedContent, geminiConfig);
			var reply = response2?.Candidates?[0]?.Content?.Parts?[0]?.Text;

			if (fnName == "propose_task")
			{
				var pending = ExtractPendingTask(fnPart.FunctionCall.Args);
				reply ??= BuildFallbackReply(pending);
				await SaveMessagesAsync(userId, message, reply);
				return new AiChatResponse { Reply = reply, Intent = "create_task", PendingTask = pending };
			}

			if (fnName == "update_task")
			{
				var pendingUpdate = ExtractPendingUpdate(fnPart.FunctionCall.Args);
				reply ??= $"Хочу изменить задачу #{pendingUpdate.TaskId}. Подтверди изменения.";
				await SaveMessagesAsync(userId, message, reply);
				return new AiChatResponse { Reply = reply, Intent = "update_task", PendingUpdate = pendingUpdate };
			}

			if (fnName == "delete_task")
			{
				var pendingDelete = ExtractPendingDelete(fnPart.FunctionCall.Args);
				reply ??= $"Удалить задачу «{pendingDelete.TaskTitle}»? Подтверди удаление.";
				await SaveMessagesAsync(userId, message, reply);
				return new AiChatResponse { Reply = reply, Intent = "delete_task", PendingDelete = pendingDelete };
			}

			reply ??= "Не удалось получить ответ.";
			await SaveMessagesAsync(userId, message, reply);
			return new AiChatResponse { Reply = reply };
		}

		private static GenerateContentConfig BuildConfig(bool isGoogleConnected, string taskContext) => new()
		{
			SystemInstruction = new Content
			{
				Parts =
				[
					new Part
					{
						Text = $"""
							Ты TaskyAI — ИИ-планировщик задач.
							Текущая дата и время: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC. Часовой пояс пользователя: GMT+3.
							Google Calendar: {(isGoogleConnected ? "подключён" : "не подключён")}.

							Твои функции:
							- propose_task: когда пользователь хочет создать новую задачу. Вызывай сразу как известно название.
							- update_task: когда пользователь хочет изменить существующую задачу (используй ID из списка).
							- delete_task: когда пользователь хочет удалить задачу (используй ID из списка).
							{(isGoogleConnected ? "- sync_google: когда пользователь просит синхронизировать с Google Calendar («синхронизируй», «обнови с календарём»)." : "")}
							{(isGoogleConnected ? "- disconnect_google: когда пользователь просит отключить Google Calendar." : "")}

							Ты НИКОГДА не говоришь «я добавил/изменил/удалил задачу» — только вызываешь функцию, после чего просишь пользователя подтвердить.

							Правила для propose_task:
							- Как только известно название — вызови propose_task, не задавай лишних вопросов.
							- start_at: ISO 8601. Дата без времени → "2026-03-20". С временем → "2026-03-20T17:00:00Z" (учитывай GMT+3).
							- is_all_day = true если только дата или «на весь день», false если есть конкретное время.

							Задачи пользователя (для update/delete):
							{taskContext}

							В конце всегда добавляй одну фразу: что пользователь может уточнить детали следующим сообщением.
							Отвечай кратко и по-русски.
							"""
					}
				]
			},
			Tools = [ProposeTask]
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
				}
			}

			return task.Id;
		}

		public async Task<Application.DTOs.Responses.TaskResponse> ConfirmUpdateAsync(int userId, PendingUpdateDto pending)
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

		private static List<Content> BuildContents(IEnumerable<AiConversationHistory> history, string newMessage)
    {
        var contents = history
            .Select(h => new Content
            {
                Role = h.Role,
                Parts = [new Part { Text = h.Content }]
            })
            .ToList();

        contents.Add(new Content
        {
            Role = "user",
            Parts = [new Part { Text = newMessage }]
        });

        return contents;
    }

    private static PendingTaskDto ExtractPendingTask(object? rawArgs)
    {
        var json = JsonSerializer.Serialize(rawArgs);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

			string GetStr(string key) =>
					root.TryGetProperty(key, out var el) ? el.GetString() ?? "" : "";

				 bool GetBool(string key)
			    {
			        if (!root.TryGetProperty(key, out var el)) return false;
			        return el.ValueKind switch
			        {
			            JsonValueKind.True  => true,
			            JsonValueKind.False => false,
			            JsonValueKind.String => el.GetString()?.ToLower() == "true",
			            _ => false
			        };
			    }

							DateTime? GetDate(string key)
					    {
					        var s = GetStr(key);
					        if (string.IsNullOrEmpty(s)) return null;
					        // date-only format (2026-03-20)
					        if (s.Length == 10 && DateTime.TryParseExact(s, "yyyy-MM-dd",
					                null, System.Globalization.DateTimeStyles.None, out var dateOnly))
					            return DateTime.SpecifyKind(dateOnly, DateTimeKind.Utc);
					        return DateTime.TryParse(s, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt)
					            ? dt.ToUniversalTime()
					            : null;
					    }

        return new PendingTaskDto
        {
            Title = GetStr("title"),
            Priority = "Low",
            Description = GetStr("description") is { Length: > 0 } d ? d : null,
            StartAt = GetDate("start_at"),
            EndAt = GetDate("end_at"),
            IsAllDay = GetBool("is_all_day"),
        };
    }

    private static PendingUpdateDto ExtractPendingUpdate(object? rawArgs)
    {
        var json = JsonSerializer.Serialize(rawArgs);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        int GetInt(string key) =>
            root.TryGetProperty(key, out var el) ? el.GetInt32() : 0;

        string? GetStrOrNull(string key) =>
            root.TryGetProperty(key, out var el) ? (el.GetString() is { Length: > 0 } s ? s : null) : null;

        bool? GetBoolOrNull(string key)
        {
            if (!root.TryGetProperty(key, out var el)) return null;
            return el.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.String => el.GetString()?.ToLower() == "true",
                _ => null
            };
        }

        DateTime? GetDateOrNull(string key)
        {
            var s = GetStrOrNull(key);
            if (s is null) return null;
            if (s.Length == 10 && DateTime.TryParseExact(s, "yyyy-MM-dd",
                    null, System.Globalization.DateTimeStyles.None, out var dateOnly))
                return DateTime.SpecifyKind(dateOnly, DateTimeKind.Utc);
            return DateTime.TryParse(s, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt)
                ? dt.ToUniversalTime() : null;
        }

        TaskCompletionStatus? GetStatusOrNull(string key)
        {
            var s = GetStrOrNull(key);
            if (s is null) return null;
            return Enum.TryParse<TaskCompletionStatus>(s, ignoreCase: true, out var status) ? status : null;
        }

        return new PendingUpdateDto
        {
            TaskId = GetInt("task_id"),
            Title = GetStrOrNull("title"),
            Description = GetStrOrNull("description"),
            StartAt = GetDateOrNull("start_at"),
            EndAt = GetDateOrNull("end_at"),
            IsAllDay = GetBoolOrNull("is_all_day"),
            Status = GetStatusOrNull("status")
        };
    }

    private static PendingDeleteDto ExtractPendingDelete(object? rawArgs)
    {
        var json = JsonSerializer.Serialize(rawArgs);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        int taskId = root.TryGetProperty("task_id", out var idEl) ? idEl.GetInt32() : 0;
        string taskTitle = root.TryGetProperty("task_title", out var titleEl)
            ? titleEl.GetString() ?? string.Empty : string.Empty;

        return new PendingDeleteDto { TaskId = taskId, TaskTitle = taskTitle };
    }

    private static string BuildFallbackReply(PendingTaskDto task)    {
        var sb = new StringBuilder();
        sb.AppendLine("Вот что я понял:");
        sb.AppendLine($"Задача: {task.Title}");
        sb.AppendLine($"Приоритет: {task.Priority}");
        if (!string.IsNullOrEmpty(task.Description))
            sb.AppendLine($"{task.Description}");
        sb.Append("Подтвердите добавление или уточните детали.");
        return sb.ToString();
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
}

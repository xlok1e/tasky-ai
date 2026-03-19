using System.Text;
using System.Text.Json;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Domain.Entities;
using Tasky.Domain.Enums;
using Tasky.Infrastructure.Persistence;

namespace Tasky.Infrastructure.ExternalServices
{
    public class GeminiService : IAiAssistantService
    {
		private readonly Client _client;
		private readonly AppDbContext _db;

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
				}
			]
		};


		public GeminiService(IConfiguration config, AppDbContext db)
		{
			_client = new Client(apiKey: config["Gemini:ApiKey"]
            ?? throw new InvalidOperationException("Gemini API key is not configured."));
      _db = db;
		}

		public async Task<AiChatResponse> ChatAsync(int userId, string message)
		{
			if (string.IsNullOrWhiteSpace(message))
				return new AiChatResponse { Reply = "Пожалуйста, введите сообщение." };

			var config = BuildConfig();

			var history = await _db.AiConversationHistory
				.Where(h => h.UserId == userId)
				.OrderByDescending(h => h.CreatedAt)
				.Take(MaxHistoryMessage)
				.OrderBy(h => h.CreatedAt)
				.ToListAsync();

			var contents = BuildContents(history, message);

			var response = await _client.Models.GenerateContentAsync(
					ModelName,
					contents,
					config
			);
			var candidate = response?.Candidates?[0]?.Content;

			var fnPart = candidate?.Parts?.FirstOrDefault(p => p.FunctionCall?.Name == "propose_task");
			if (fnPart is not null)
			{
				var pending = ExtractPendingTask(fnPart.FunctionCall!.Args);

				var extendedContent = new List<Content>(contents) {
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
									Name = "propose_task",
									Response = new Dictionary<string, object> {["success"] = true}
								}
							}
						]
					}
				};

				var response2 = await _client.Models.GenerateContentAsync(ModelName, extendedContent, config);
				var reply = response2?.Candidates?[0]?.Content?.Parts?[0]?.Text
												?? BuildFallbackReply(pending);

				await SaveMessagesAsync(userId, message, reply);
				return new AiChatResponse { Reply = reply, PendingTask = pending };
			}
			else
			{
				var reply = candidate?.Parts?[0]?.Text ?? "Не удалось получить ответ.";
				await SaveMessagesAsync(userId, message, reply);
				return new AiChatResponse { Reply = reply };
			}
		}

		private static GenerateContentConfig BuildConfig() => new()
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

                Твоя единственная задача — собрать информацию и вызвать функцию propose_task.
                Ты НИКОГДА не говоришь "я добавил задачу" — только вызываешь propose_task, после чего сообщаешь пользователю что понял и просишь проверить.
                Подтверждение и сохранение происходит на следующем шаге — не в этом сообщении.

                Правила заполнения полей:
                - Как только известно название — немедленно вызови propose_task, не задавай лишних вопросов.
                - Если пользователь не указал название — задай один короткий вопрос только про название.
                - Если пользователь указывает время ("в 20:00", "на 15:30") — is_all_day = false, start_at = дата+время в UTC (учитывай GMT+3).
                - Если пользователь указывает только дату без времени ("на завтра", "20 марта") — is_all_day = true, start_at = только дата в формате YYYY-MM-DD.
                - Если пользователь говорит "на весь день" или не указывает ни дату ни время — is_all_day = true, start_at оставь пустым.

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
        endAt   = pending.EndAt ?? startAt?.AddMinutes(60);
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
			return task.Id;
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

    private static string BuildFallbackReply(PendingTaskDto task)
    {
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

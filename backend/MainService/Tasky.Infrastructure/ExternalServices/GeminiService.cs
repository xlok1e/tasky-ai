using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Configuration;
using Tasky.Application.Interfaces;

namespace Tasky.Infrastructure.ExternalServices
{
    public class GeminiService : IAiAssistantService
    {
        private readonly Client _client;
        private const string ModelName = "gemini-2.5-flash-lite";

        private static readonly Content SystemInstruction = new Content
        {
            Parts = new List<Part>
            {
                new Part
                {
                    Text = """
                        Ты TaskyAI — умный планировщик задач.
                        Отвечай так, очень кратко и по делу: Конечно, я добавил для вас задачу, посмотрите на ее данные: и перечисли здесь информацию о задаче.
                        """
                }
            }
        };

        public GeminiService(IConfiguration config)
        {
            var apiKey = config["Gemini:ApiKey"]
                ?? throw new InvalidOperationException("Gemini API key is not configured.");

            _client = new Client(apiKey: apiKey);
        }

        public async Task<string> ChatAsync(string message)
        {
            if (string.IsNullOrWhiteSpace(message))
                return "Пожалуйста, введите сообщение.";

            var generateConfig = new GenerateContentConfig
            {
                SystemInstruction = SystemInstruction
            };

            var response = await _client.Models.GenerateContentAsync(
                model: ModelName,
                contents: message,
                config: generateConfig
            );

            return response?.Candidates?[0]?.Content?.Parts?[0]?.Text
                   ?? "Ошибка ответа Gemini";
        }
    }
}

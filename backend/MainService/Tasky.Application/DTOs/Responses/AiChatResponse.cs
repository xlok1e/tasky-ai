namespace Tasky.Application.DTOs.Responses;

public sealed class AiChatResponse
{
    public string Reply { get; init; } = string.Empty;
    public PendingTaskDto? PendingTask { get; init; }
}

namespace Tasky.Application.DTOs.Responses;

public sealed class AiChatResponse
{
    public string Reply { get; init; } = string.Empty;
    public string? Intent { get; init; }
    public PendingTaskDto? PendingTask { get; init; }
    public PendingUpdateDto? PendingUpdate { get; init; }
    public PendingDeleteDto? PendingDelete { get; init; }
}

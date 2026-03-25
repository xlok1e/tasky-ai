namespace Tasky.Application.DTOs.Responses;

public sealed class PendingTaskDto
{
    public string Title { get; init; } = string.Empty;
    public string Priority { get; init; } = "Low";
    public string? Description { get; init; }
    public DateTime? StartAt { get; init; }
    public DateTime? EndAt { get; init; }
    public bool IsAllDay { get; init; }
    public string? ListName { get; init; }
}

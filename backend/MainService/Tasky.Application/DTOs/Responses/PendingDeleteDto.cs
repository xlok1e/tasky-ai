namespace Tasky.Application.DTOs.Responses;

public sealed class PendingDeleteDto
{
    public int TaskId { get; init; }
    public string TaskTitle { get; init; } = string.Empty;
}

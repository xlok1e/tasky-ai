using Tasky.Domain.Enums;

namespace Tasky.Application.DTOs.Responses;

public sealed class PendingUpdateDto
{
    public int TaskId { get; init; }
    public string? Title { get; init; }
    public string? Description { get; init; }
    public DateTime? StartAt { get; init; }
    public DateTime? EndAt { get; init; }
    public bool? IsAllDay { get; init; }
    public TaskCompletionStatus? Status { get; init; }
}

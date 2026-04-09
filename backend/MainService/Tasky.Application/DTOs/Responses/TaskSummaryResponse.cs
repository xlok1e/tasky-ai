using Tasky.Domain.Enums;

namespace Tasky.Application.DTOs.Responses;

public record TaskSummaryResponse(
    int Id,
    int? ListId,
    string? ListName,
    string Title,
    string? Description,
    DateTime? StartAt,
    DateTime? EndAt,
    DateTime? Deadline,
    bool IsAllDay,
    TaskPriority Priority,
    TaskCompletionStatus Status,
    DateTime CreatedAt,
    string? GoogleEventId,
    DateTime? NotifyAt
);

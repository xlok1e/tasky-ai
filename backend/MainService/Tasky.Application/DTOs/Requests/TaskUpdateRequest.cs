using Tasky.Domain.Enums;
namespace Tasky.Application.DTOs.Requests;

public record TaskUpdateRequest(
    string Title,
    string? Description,
    DateTime? StartAt,
    DateTime? EndAt,
    DateTime? Deadline,
    bool IsAllDay,
    TaskPriority Priority,
    TaskCompletionStatus Status,
    int? ListId,
    DateTime? NotifyAt
);

using Tasky.Domain.Enums;

namespace Tasky.Application.DTOs.Responses;

public record TaskSummaryResponse(
    int Id,
    string? ListName,
    string Title,
    string? Description,
    DateTime? StartAt,
    DateTime? EndAt,
    TaskPriority Priority,
    TaskCompletionStatus Status,
    DateTime CreatedAt,
    string? GoogleEventId
);

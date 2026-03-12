using Tasky.Domain.Enums;
namespace Tasky.Application.DTOs.Requests;

public record TaskUpdateRequest(
    string Title,
    string? Description,
    DateTime? StartAt,
    DateTime? EndAt,
    DateTime? Deadline,
    TaskPriority Priority,
    TaskCompletionStatus Status,
    int? ListId

);


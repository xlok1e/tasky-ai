using Tasky.Domain.Enums;
namespace Tasky.Application.DTOs.Requests;

public record TaskCreateRequest(
    string Title,
    string? Description,
    DateTime? StartAt,
    DateTime? EndAt,
    DateTime? Deadline,
    TaskPriority Priority,
    int? ListId
);


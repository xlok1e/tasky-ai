namespace Tasky.Application.DTOs.Responses;

public record ListResponse(
    int Id,
    string Name,
    string ColorHex,
    int UncompletedTasksCount,
    DateTime CreatedAt
);
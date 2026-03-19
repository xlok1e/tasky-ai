namespace Tasky.Application.DTOs.Responses;

public record ListTasksResponse(
    int TotalCount,
    IEnumerable<TaskResponse> Tasks
);

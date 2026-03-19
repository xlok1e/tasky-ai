namespace Tasky.Application.DTOs.Responses;
public record ListTasksResponse(
    int Count,                    // Обязательный атрибут count
    IEnumerable<TaskResponse> Tasks
);
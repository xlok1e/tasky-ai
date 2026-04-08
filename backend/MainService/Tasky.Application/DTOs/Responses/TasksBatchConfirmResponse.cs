namespace Tasky.Application.DTOs.Responses;

public sealed class TasksBatchConfirmResponse
{
    public IReadOnlyList<TaskConfirmResponse> Tasks { get; init; } = [];
    public int CreatedCount => Tasks.Count;
}

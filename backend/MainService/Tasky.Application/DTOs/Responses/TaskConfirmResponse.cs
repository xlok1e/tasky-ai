namespace Tasky.Application.DTOs.Responses;

public sealed class TaskConfirmResponse
{
    public int TaskId { get; init; }
    public string Title { get; init; } = string.Empty;
}

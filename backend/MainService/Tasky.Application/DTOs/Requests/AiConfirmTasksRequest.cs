using Tasky.Application.DTOs.Responses;

namespace Tasky.Application.DTOs.Requests;

public sealed class AiConfirmTasksRequest
{
    public IReadOnlyList<PendingTaskDto> Tasks { get; init; } = [];
}

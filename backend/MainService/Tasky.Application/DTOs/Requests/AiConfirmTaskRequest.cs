using Tasky.Application.DTOs.Responses;

namespace Tasky.Application.DTOs.Requests;

public sealed class AiConfirmTaskRequest
{
    public PendingTaskDto Task { get; init; } = null!;
}

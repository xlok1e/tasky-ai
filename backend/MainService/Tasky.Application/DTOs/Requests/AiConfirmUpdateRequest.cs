using Tasky.Application.DTOs.Responses;

namespace Tasky.Application.DTOs.Requests;

public sealed class AiConfirmUpdateRequest
{
    public required PendingUpdateDto Update { get; init; }
}

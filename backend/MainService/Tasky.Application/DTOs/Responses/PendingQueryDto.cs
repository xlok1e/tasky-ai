namespace Tasky.Application.DTOs.Responses;

public sealed class PendingQueryDto
{
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
    public string? ListName { get; init; }
    public string? Priority { get; init; }
    public string? Status { get; init; }
}

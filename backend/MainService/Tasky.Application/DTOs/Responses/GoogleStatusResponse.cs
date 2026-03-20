namespace Tasky.Application.DTOs.Responses;

public sealed record GoogleStatusResponse(
    bool IsConnected,
    string? CalendarId,
    DateTime? LastSyncAt
);

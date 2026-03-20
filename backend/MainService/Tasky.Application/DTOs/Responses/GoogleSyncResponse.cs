namespace Tasky.Application.DTOs.Responses;

public sealed record GoogleSyncResponse(
    int SyncedCount,
    int CreatedCount,
    int UpdatedCount,
    string Message
);

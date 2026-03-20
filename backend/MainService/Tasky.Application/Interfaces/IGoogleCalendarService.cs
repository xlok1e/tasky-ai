using Tasky.Domain.Entities;

namespace Tasky.Application.Interfaces;

public interface IGoogleCalendarService
{
    Task<bool> IsConnectedAsync(int userId);
    Task RefreshTokenIfNeededAsync(GoogleSyncState state);
    Task<string> CreateEventAsync(GoogleSyncState state, TaskItem task);
    Task UpdateEventAsync(GoogleSyncState state, string googleEventId, TaskItem task);
    Task DeleteEventAsync(GoogleSyncState state, string googleEventId);
}

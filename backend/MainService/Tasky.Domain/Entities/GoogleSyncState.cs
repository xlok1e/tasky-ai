namespace Tasky.Domain.Entities;

public class GoogleSyncState
{
    public int Id { get; set; }
    public int UserId { get; set; }

    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime TokenExpiresAt { get; set; }
    public DateTime? LastSyncAt { get; set; }
    public string? GoogleCalendarId { get; set; }

    public User User { get; set; } = null!;
}
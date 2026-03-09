namespace Tasky.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public long TelegramId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public UserSettings? Settings { get; set; }
    public ICollection<TaskList> Lists { get; set; } = [];
    public ICollection<TaskItem> Tasks { get; set; } = [];
    public ICollection<AiConversationHistory> AiHistory { get; set; } = [];
    public ICollection<NotificationQueue> Notifications { get; set; } = [];
    public GoogleSyncState?  GoogleSyncState { get; set; }
}
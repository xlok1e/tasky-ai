using Tasky.Domain.Enums;

namespace Tasky.Domain.Entities;

public class NotificationQueue
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? TaskId { get; set; }

    public NotificationType Type { get; set; }
    public DateTime ScheduledAt { get; set; }
    public bool IsSent { get; set; } = false;
    public DateTime? SentAt { get; set; }

    public User User { get; set; } = null!;
}
using Tasky.Domain.Enums;

namespace Tasky.Domain.Entities;

public class TaskItem
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? ListId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public DateTime? StartAt { get; set; }
    public DateTime? EndAt { get; set; }
    public DateTime? Deadline { get; set; }
    public bool IsAllDay { get; set; } = false;

    public TaskPriority Priority { get; set; } = TaskPriority.Low;
    public TaskCompletionStatus Status { get; set; } = TaskCompletionStatus.InProgress;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public string? GoogleEventId { get; set; }

    public User User { get; set; } = null!;
    public TaskList? List { get; set; }
    public ICollection<ExecutionHistory> ExecutionHistory { get; set; } = [];
}

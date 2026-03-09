namespace Tasky.Domain.Entities;

public class TaskList
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#6366f1";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public User User { get; set; } = null!;
    public ICollection<TaskItem> Tasks { get; set; } = [];
}
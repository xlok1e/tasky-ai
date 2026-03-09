namespace Tasky.Domain.Entities;

public class ExecutionHistory
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }

    public TaskItem Task { get; set; } = null!;
}
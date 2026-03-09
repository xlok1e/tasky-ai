namespace Tasky.Domain.Entities;

public class AiConversationHistory
{
    public int Id { get; set; }
    public int UserId { get; set; }

    // "user" | "assistant"
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
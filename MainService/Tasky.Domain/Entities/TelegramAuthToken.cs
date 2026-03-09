namespace Tasky.Domain.Entities;

public class TelegramAuthToken
{
    public int Id { get; set; }
    public string Token { get; set; } = string.Empty;
    public int? UserId { get; set; }
    public bool IsUsed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(10);

    public User? User { get; set; }
}

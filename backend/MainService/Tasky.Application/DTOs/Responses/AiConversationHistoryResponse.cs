namespace Tasky.Application.DTOs.Responses;

public class AiConversationHistoryResponse
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

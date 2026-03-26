namespace Tasky.Application.DTOs.Responses;

public class AiConversationHistoryListResponse
{
    public List<AiConversationHistoryResponse> Messages { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
    public int TotalPages { get; set; }
}

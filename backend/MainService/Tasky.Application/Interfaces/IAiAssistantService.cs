using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;

namespace Tasky.Application.Interfaces
{
    public interface IAiAssistantService
    {
        Task<AiChatResponse> ChatAsync(int userId, string message);
        Task<int> ConfirmTaskAsync(int userId, PendingTaskDto pending);
        Task<TaskResponse> ConfirmUpdateAsync(int userId, PendingUpdateDto pending);
        Task<bool> ConfirmDeleteAsync(int userId, int taskId);
        Task<AiConversationHistoryListResponse> GetHistoryAsync(int userId, int page, int limit);
    }
}

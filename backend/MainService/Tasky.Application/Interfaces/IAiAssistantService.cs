using Tasky.Application.DTOs.Responses;

namespace Tasky.Application.Interfaces

{
    public interface IAiAssistantService
    {
		Task<AiChatResponse> ChatAsync(int userId, string message);
        Task<int> ConfirmTaskAsync(int userId, PendingTaskDto pending);
    }
}

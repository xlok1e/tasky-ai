using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Domain.Enums;

namespace Tasky.Application.Interfaces
{
    public interface ITaskService
    {
        Task<TaskResponse> CreateAsync(int userId, TaskCreateRequest request);
        Task<TaskResponse> UpdateAsync(int userId, int taskId, TaskUpdateRequest request);
        Task<TaskResponse?> GetByIdAsync(int userId, int taskId);
        Task<IEnumerable<TaskSummaryResponse>> GetAllAsync(
            int userId,
            int? listId,
            TaskPriority? priority,
            DateTime? dueDate,
            TaskCompletionStatus? status,
            int? offset,
            int? limit,
            string? sort = "deadline");
        Task<bool> DeleteAsync(int userId, int taskId);
    }
}

using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;

namespace Tasky.Application.Interfaces
{
    public interface ITaskService
    {
        Task<TaskResponse> CreateAsync(int userId, TaskCreateRequest request);
        Task<TaskResponse> UpdateAsync(int userId, int taskId, TaskUpdateRequest request);
        Task<TaskResponse?> GetByIdAsync(int userId, int taskId);
        Task<IEnumerable<TaskResponse>> GetAllAsync(int userId, int? list_id, string? priority, DateTime? due_date, string? status, int? offset, int? limit, string? sort = "deadline");
        Task<bool> DeleteAsync(int userId, int taskId);
    }
}
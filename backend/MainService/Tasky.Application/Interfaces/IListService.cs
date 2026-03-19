using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;

namespace Tasky.Application.Interfaces
{
    public interface IListService
    {
        Task<ListResponse> CreateAsync(int userId, ListCreateRequest request);
        Task<ListResponse> UpdateAsync(int userId, int listId, ListUpdateRequest request);
        Task<ListResponse?> GetByIdAsync(int userId, int listId);
        Task<IEnumerable<ListResponse>> GetAllAsync(int userId);
        Task<bool> DeleteAsync(int userId, int listId);
        Task<ListTasksResponse> GetListTasksAsync(int userId, int listId, string? priority, DateTime? dueDate, string? status, int? offset, int? limit, string? sort = "deadline");
        Task<TaskResponse> CreateTaskInListAsync(int userId, int listId, TaskCreateRequest request);
    }
}


using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;

namespace Tasky.Application.Interfaces
{
    public interface IAnalyticsService
    {
        Task<TaskAnalyticsResponse> GetAnalyticsAsync(int userId, TaskAnalyticsRequest request);
    }
}

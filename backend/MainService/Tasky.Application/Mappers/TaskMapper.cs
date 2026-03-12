using Tasky.Application.DTOs.Responses;
using Tasky.Domain.Entities;

namespace Tasky.Application.Mappers
{
    public static class TaskMapper
    {
        public static TaskResponse ToResponse(this TaskItem item)
            => new(
                item.Id,
                item.UserId,
                item.ListId,
                item.List?.Name,
                item.Title,
                item.Description,
                item.StartAt,
                item.EndAt,
                item.Deadline,
                item.Priority,
                item.Status,
                item.CreatedAt,
                item.CompletedAt,
                item.GoogleEventId
            );
    }
}
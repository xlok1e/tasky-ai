using Tasky.Application.DTOs.Responses;
using Tasky.Domain.Entities;
using Tasky.Domain.Enums;

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

        public static TaskSummaryResponse ToSummaryResponse(this TaskItem item)
            => new(
                item.Id,
                item.ListId,
                item.List?.Name,
                item.Title,
                item.Description,
                item.StartAt,
                item.EndAt,
                item.Priority,
                item.Status,
                item.CreatedAt,
                item.GoogleEventId
            );

        public static ListResponse ToResponse(this TaskList list)
        {
            var uncompletedCount = list.Tasks.Count(t => t.Status != TaskCompletionStatus.Completed);
            return new(
                list.Id,
                list.Name,
                list.Color,
                uncompletedCount,
                list.CreatedAt
            );
        }
    }
}

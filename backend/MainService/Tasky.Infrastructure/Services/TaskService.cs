using Microsoft.EntityFrameworkCore;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Application.Mappers;
using Tasky.Infrastructure.Persistence;
using Tasky.Domain.Entities;

namespace Tasky.Infrastructure.Services
{
    public class TaskService : ITaskService
    {
        private readonly AppDbContext _db;
        private readonly IGoogleCalendarService _googleCalendar;

        public TaskService(AppDbContext db, IGoogleCalendarService googleCalendar)
        {
            _db = db;
            _googleCalendar = googleCalendar;
        }

        public async Task<TaskResponse> CreateAsync(int userId, TaskCreateRequest request)
        {
            // Валидация Title
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new ArgumentException("Название задачи не может быть пустым.");

            // Валидация: StartAt/EndAt и Deadline - взаимоисключающие
            var hasTimeRange = request.StartAt.HasValue || request.EndAt.HasValue;
            var hasDeadline = request.Deadline.HasValue;

            if (hasTimeRange && hasDeadline)
                throw new ArgumentException("Нельзя указывать одновременно диапазон времени (StartAt/EndAt) и Deadline.");

            if (hasTimeRange)
            {
                if (!request.StartAt.HasValue || !request.EndAt.HasValue)
                    throw new ArgumentException("Если указывается диапазон времени, то StartAt и EndAt оба обязательны.");

                if (request.StartAt >= request.EndAt)
                    throw new ArgumentException("StartAt должен быть раньше EndAt.");
            }

            if (request.ListId.HasValue)
            {
                var listExists = await _db.Lists.AnyAsync(l => l.Id == request.ListId.Value && l.UserId == userId);
                if (!listExists)
                    throw new KeyNotFoundException("Список задач не найден или не принадлежит пользователю.");
            }

            var task = new TaskItem
            {
                UserId = userId,
                Title = request.Title.Trim(),
                Description = request.Description?.Trim(),
                StartAt = request.StartAt,
                EndAt = request.EndAt,
                Deadline = request.Deadline,
                Priority = request.Priority ?? Tasky.Domain.Enums.TaskPriority.Low,
                ListId = request.ListId
            };

            _db.Tasks.Add(task);
            await _db.SaveChangesAsync();

            var googleState = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == userId);
            if (googleState is not null)
            {
                try
                {
                    await _googleCalendar.RefreshTokenIfNeededAsync(googleState);
                    task.GoogleEventId = await _googleCalendar.CreateEventAsync(googleState, task);
                    await _db.SaveChangesAsync();
                }
                catch
                {
                }
            }

            return task.ToResponse();
        }

        public async Task<TaskResponse> UpdateAsync(int userId, int taskId, TaskUpdateRequest request)
        {
            var task = await _db.Tasks
                .Include(t => t.List)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId)
                ?? throw new KeyNotFoundException("Задача не найдена");

            if (string.IsNullOrWhiteSpace(request.Title))
                throw new ArgumentException("Название задачи не может быть пустым.");

            var hasTimeRange = request.StartAt.HasValue || request.EndAt.HasValue;
            var hasDeadline = request.Deadline.HasValue;

            if (hasTimeRange && hasDeadline)
                throw new ArgumentException("Нельзя указывать одновременно диапазон времени (StartAt/EndAt) и Deadline.");

            if (hasTimeRange)
            {
                if (!request.StartAt.HasValue || !request.EndAt.HasValue)
                    throw new ArgumentException("Если указывается диапазон времени, то StartAt и EndAt оба обязательны.");

                if (request.StartAt >= request.EndAt)
                    throw new ArgumentException("StartAt должен быть раньше EndAt.");
            }

            if (request.ListId.HasValue && request.ListId != task.ListId)
            {
                var listExists = await _db.Lists.AnyAsync(l => l.Id == request.ListId.Value && l.UserId == userId);
                if (!listExists)
                    throw new KeyNotFoundException("Список задач не найден или не принадлежит пользователю.");
            }

            task.Title = request.Title.Trim();
            task.Description = request.Description?.Trim();
            task.StartAt = request.StartAt;
            task.EndAt = request.EndAt;
            task.Deadline = request.Deadline;
            task.IsAllDay = request.IsAllDay;
            task.Priority = request.Priority;

            var wasCompleted = task.Status == Tasky.Domain.Enums.TaskCompletionStatus.Completed;
            task.Status = request.Status;
            var nowCompleted = task.Status == Tasky.Domain.Enums.TaskCompletionStatus.Completed;
            if (!wasCompleted && nowCompleted)
            {
                task.CompletedAt = DateTime.UtcNow;
            }
            else if (wasCompleted && !nowCompleted)
            {
                task.CompletedAt = null;
            }

            task.ListId = request.ListId;

            await _db.SaveChangesAsync();

            if (!string.IsNullOrEmpty(task.GoogleEventId))
            {
                var googleState = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == userId);
                if (googleState is not null)
                {
                    try
                    {
                        await _googleCalendar.RefreshTokenIfNeededAsync(googleState);
                        await _googleCalendar.UpdateEventAsync(googleState, task.GoogleEventId, task);
                    }
                    catch
                    {
                    }
                }
            }

            return task.ToResponse();
        }

        public async Task<TaskResponse?> GetByIdAsync(int userId, int taskId)
        {
            var task = await _db.Tasks
                .Include(t => t.List)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);

            return task?.ToResponse();
        }

        public async Task<IEnumerable<TaskSummaryResponse>> GetAllAsync(
            int userId,
            int? listId,
            bool inboxOnly,
            Tasky.Domain.Enums.TaskPriority? priority,
            DateTime? dueDate,
            Tasky.Domain.Enums.TaskCompletionStatus? status,
            int? offset,
            int? limit,
            string? sort = "deadline",
            string? dateOrder = null,
            string? priorityOrder = null)
        {
            var query = _db.Tasks
                .Include(t => t.List)
                .Where(t => t.UserId == userId);

            if (inboxOnly)
                query = query.Where(t => t.ListId == null);
            else if (listId.HasValue)
                query = query.Where(t => t.ListId == listId.Value);

            if (priority.HasValue)
                query = query.Where(t => t.Priority == priority.Value);

            if (dueDate.HasValue)
                query = query.Where(t => t.Deadline.HasValue && t.Deadline.Value.Date == dueDate.Value.Date);

            if (status.HasValue)
                query = query.Where(t => t.Status == status.Value);

            query = ApplySorting(query, sort, dateOrder, priorityOrder);

            if (offset.HasValue)
                query = query.Skip(offset.Value);

            if (limit.HasValue)
                query = query.Take(limit.Value);

            return await query
                .Select(t => t.ToSummaryResponse())
                .ToListAsync();
        }

        private static IQueryable<TaskItem> ApplySorting(
            IQueryable<TaskItem> query,
            string? sort,
            string? dateOrder,
            string? priorityOrder)
        {
            IOrderedQueryable<TaskItem>? orderedQuery = null;

            if (!string.IsNullOrWhiteSpace(dateOrder))
                orderedQuery = ApplyEffectiveDateOrdering(query, dateOrder);

            if (!string.IsNullOrWhiteSpace(priorityOrder))
                orderedQuery = orderedQuery is null
                    ? ApplyPriorityOrdering(query, priorityOrder)
                    : ApplyPriorityOrdering(orderedQuery, priorityOrder);

            if (orderedQuery is not null)
                return orderedQuery.ThenByDescending(task => task.CreatedAt);

            return (sort?.ToLowerInvariant() ?? "deadline") switch
            {
                "priority" => query.OrderByDescending(task => task.Priority)
                    .ThenBy(task => (task.Deadline ?? task.EndAt ?? task.StartAt).HasValue ? 0 : 1)
                    .ThenBy(task => task.Deadline ?? task.EndAt ?? task.StartAt)
                    .ThenByDescending(task => task.CreatedAt),
                "created" => query.OrderByDescending(task => task.CreatedAt),
                _ => query.OrderBy(task => (task.Deadline ?? task.EndAt ?? task.StartAt).HasValue ? 0 : 1)
                    .ThenBy(task => task.Deadline ?? task.EndAt ?? task.StartAt)
                    .ThenByDescending(task => task.CreatedAt),
            };
        }

        private static IOrderedQueryable<TaskItem> ApplyEffectiveDateOrdering(
            IQueryable<TaskItem> query,
            string dateOrder)
        {
            return dateOrder.Equals("desc", StringComparison.OrdinalIgnoreCase)
                ? query.OrderBy(task => (task.Deadline ?? task.EndAt ?? task.StartAt).HasValue ? 0 : 1)
                    .ThenByDescending(task => task.Deadline ?? task.EndAt ?? task.StartAt)
                : query.OrderBy(task => (task.Deadline ?? task.EndAt ?? task.StartAt).HasValue ? 0 : 1)
                    .ThenBy(task => task.Deadline ?? task.EndAt ?? task.StartAt);
        }

        private static IOrderedQueryable<TaskItem> ApplyPriorityOrdering(
            IQueryable<TaskItem> query,
            string priorityOrder)
        {
            return priorityOrder.Equals("asc", StringComparison.OrdinalIgnoreCase)
                ? query.OrderBy(task => task.Priority)
                : query.OrderByDescending(task => task.Priority);
        }

        private static IOrderedQueryable<TaskItem> ApplyPriorityOrdering(
            IOrderedQueryable<TaskItem> query,
            string priorityOrder)
        {
            return priorityOrder.Equals("asc", StringComparison.OrdinalIgnoreCase)
                ? query.ThenBy(task => task.Priority)
                : query.ThenByDescending(task => task.Priority);
        }

        public async Task<bool> DeleteAsync(int userId, int taskId)
        {
            var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
            if (task == null)
                return false;

            if (!string.IsNullOrEmpty(task.GoogleEventId))
            {
                var googleState = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == userId);
                if (googleState is not null)
                {
                    try
                    {
                        await _googleCalendar.RefreshTokenIfNeededAsync(googleState);
                        await _googleCalendar.DeleteEventAsync(googleState, task.GoogleEventId);
                    }
                    catch
                    {
                    }
                }
            }

            _db.Tasks.Remove(task);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}

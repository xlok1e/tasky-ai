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

        public TaskService(AppDbContext db)
        {
            _db = db;
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
            return task.ToResponse();
        }

        public async Task<TaskResponse> UpdateAsync(int userId, int taskId, TaskUpdateRequest request)
        {
            var task = await _db.Tasks
                .Include(t => t.List)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId)
                ?? throw new KeyNotFoundException("Задача не найдена");

            if (request.ListId.HasValue && request.ListId != task.ListId)
            {
                var listExists = await _db.Lists.AnyAsync(l => l.Id == request.ListId.Value && l.UserId == userId);
                if (!listExists)
                    throw new KeyNotFoundException("Список задач не найден или не принадлежит пользователю.");
            }

            task.Title = request.Title;
            task.Description = request.Description;
            task.StartAt = request.StartAt;
            task.EndAt = request.EndAt;
            task.Deadline = request.Deadline;
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
            return task.ToResponse();
        }

        public async Task<TaskResponse?> GetByIdAsync(int userId, int taskId)
        {
            var task = await _db.Tasks
                .Include(t => t.List)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);

            return task?.ToResponse();
        }

        public async Task<IEnumerable<TaskResponse>> GetAllAsync(int userId, int? list_id, string? priority, DateTime? due_date, string? status, int? offset, int? limit, string? sort = "deadline")
        {
            var query = _db.Tasks
                .Include(t => t.List)
                .Where(t => t.UserId == userId);
            if (list_id.HasValue)
            {
                query = query.Where(t => t.ListId == list_id.Value);
            }
            if (!string.IsNullOrEmpty(priority))
            {
                if (Enum.TryParse<Tasky.Domain.Enums.TaskPriority>(priority, true, out var p))
                {
                    query = query.Where(t => t.Priority == p);
                }
            }
            if (due_date.HasValue)
            {
                query = query.Where(t => t.Deadline.HasValue && t.Deadline.Value.Date == due_date.Value.Date);
            }
            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<Tasky.Domain.Enums.TaskCompletionStatus>(status, true, out var s))
                {
                    query = query.Where(t => t.Status == s);
                }
            }

            // Apply sorting
            query = (sort?.ToLower() ?? "deadline") switch
            {
                "priority" => query.OrderByDescending(t => t.Priority),
                "created" => query.OrderByDescending(t => t.CreatedAt),
                _ => query.OrderBy(t => t.Deadline ?? DateTime.MaxValue)
            };

            if (offset.HasValue)
            {
                query = query.Skip(offset.Value);
            }

            if (limit.HasValue)
            {
                query = query.Take(limit.Value);
            }
            return await query
                .Select(t => t.ToResponse())
                .ToListAsync();
        }

        public async Task<bool> DeleteAsync(int userId, int taskId)
        {
            var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
            if (task == null)
                return false;

            _db.Tasks.Remove(task);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
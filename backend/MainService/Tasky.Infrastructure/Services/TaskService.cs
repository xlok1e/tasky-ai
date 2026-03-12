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
            // if the caller specified a list, make sure it exists and belongs to the user
            if (request.ListId.HasValue)
            {
                var listExists = await _db.Lists.AnyAsync(l => l.Id == request.ListId.Value && l.UserId == userId);
                if (!listExists)
                    throw new KeyNotFoundException("Task list not found or does not belong to user");
            }

            var task = new TaskItem
            {
                UserId = userId,
                Title = request.Title,
                Description = request.Description,
                StartAt = request.StartAt,
                EndAt = request.EndAt,
                Deadline = request.Deadline,
                Priority = request.Priority,
                ListId = request.ListId
                // Status defaults to InProgress, CreatedAt is set by entity
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
                ?? throw new KeyNotFoundException("Task not found");

            // if list changed, make sure new list is valid for the user
            if (request.ListId.HasValue && request.ListId != task.ListId)
            {
                var listExists = await _db.Lists.AnyAsync(l => l.Id == request.ListId.Value && l.UserId == userId);
                if (!listExists)
                    throw new KeyNotFoundException("Task list not found or does not belong to user");
            }

            task.Title = request.Title;
            task.Description = request.Description;
            task.StartAt = request.StartAt;
            task.EndAt = request.EndAt;
            task.Deadline = request.Deadline;
            task.Priority = request.Priority;

            // completed flag handling
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

        public async Task<IEnumerable<TaskResponse>> GetAllAsync(int userId)
        {
            return await _db.Tasks
                .Include(t => t.List)
                .Where(t => t.UserId == userId)
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
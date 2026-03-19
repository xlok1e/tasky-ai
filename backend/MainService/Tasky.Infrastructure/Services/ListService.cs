using Microsoft.EntityFrameworkCore;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Infrastructure.Persistence;
using Tasky.Domain.Entities;
using Tasky.Domain.Enums;
using Tasky.Application.Mappers;
using System.Text.RegularExpressions;

namespace Tasky.Infrastructure.Services
{
    public class ListService : IListService
    {
        private static readonly Regex HexColorRegex = new(@"^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled);

        private readonly AppDbContext _db;

        public ListService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<ListResponse> CreateAsync(int userId, ListCreateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Название списка не может быть пустым.");

            if (!string.IsNullOrEmpty(request.ColorHex) && !HexColorRegex.IsMatch(request.ColorHex))
                throw new ArgumentException("ColorHex должен быть в формате #RRGGBB.");

            var list = new TaskList
            {
                UserId = userId,
                Name = request.Name.Trim(),
                Color = request.ColorHex,
                CreatedAt = DateTime.UtcNow
            };

            _db.Lists.Add(list);
            await _db.SaveChangesAsync();

            return list.ToResponse();
        }

        public async Task<ListResponse> UpdateAsync(int userId, int listId, ListUpdateRequest request)
        {
            var list = await _db.Lists
                .Include(l => l.Tasks)
                .FirstOrDefaultAsync(l => l.Id == listId && l.UserId == userId);
            if (list is null)
                throw new KeyNotFoundException("Список задач не найден.");

            if (!string.IsNullOrWhiteSpace(request.Name))
                list.Name = request.Name.Trim();

            if (!string.IsNullOrWhiteSpace(request.ColorHex))
            {
                if (!HexColorRegex.IsMatch(request.ColorHex))
                    throw new ArgumentException("ColorHex должен быть в формате #RRGGBB.");
                list.Color = request.ColorHex;
            }

            await _db.SaveChangesAsync();
            return list.ToResponse();
        }

        public async Task<ListResponse?> GetByIdAsync(int userId, int listId)
        {
            var list = await _db.Lists
                .Include(l => l.Tasks)
                .FirstOrDefaultAsync(l => l.Id == listId && l.UserId == userId);

            return list?.ToResponse();
        }

        public async Task<IEnumerable<ListResponse>> GetAllAsync(int userId)
        {
            var lists = await _db.Lists
                .Where(l => l.UserId == userId)
                .Include(l => l.Tasks)
                .ToListAsync();

            return lists.Select(l => l.ToResponse());
        }

        public async Task<bool> DeleteAsync(int userId, int listId)
        {
            var list = await _db.Lists.FirstOrDefaultAsync(l => l.Id == listId && l.UserId == userId);
            if (list is null)
                return false;

            _db.Lists.Remove(list);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<ListTasksResponse> GetListTasksAsync(
            int userId,
            int listId,
            string? priority,
            DateTime? dueDate,
            string? status,
            int? offset,
            int? limit,
            string? sort = "deadline")
        {
            var listExists = await _db.Lists.AnyAsync(l => l.UserId == userId && l.Id == listId);
            if (!listExists)
                throw new KeyNotFoundException($"Список с id {listId} не найден.");

            var query = _db.Tasks
                .Include(t => t.List)
                .Where(t => t.UserId == userId && t.ListId == listId)
                .AsQueryable();

            if (!string.IsNullOrEmpty(priority))
            {
                if (!Enum.TryParse<TaskPriority>(priority, true, out var priorityEnum))
                    throw new ArgumentException($"Недопустимое значение priority: '{priority}'.");
                query = query.Where(t => t.Priority == priorityEnum);
            }

            if (dueDate.HasValue)
                query = query.Where(t => t.Deadline.HasValue && t.Deadline.Value.Date == dueDate.Value.Date);

            if (!string.IsNullOrEmpty(status))
            {
                if (!Enum.TryParse<TaskCompletionStatus>(status, true, out var statusEnum))
                    throw new ArgumentException($"Недопустимое значение status: '{status}'.");
                query = query.Where(t => t.Status == statusEnum);
            }

            query = sort?.ToLower() switch
            {
                "priority" => query.OrderByDescending(t => t.Priority),
                "created" => query.OrderByDescending(t => t.CreatedAt),
                "title" => query.OrderBy(t => t.Title),
                "status" => query.OrderBy(t => t.Status),
                _ => query.OrderBy(t => t.Deadline)
            };

            var totalCount = await query.CountAsync();

            if (offset.HasValue)
                query = query.Skip(offset.Value);

            if (limit.HasValue)
                query = query.Take(limit.Value);

            var tasks = await query.ToListAsync();
            var taskResponses = tasks.Select(t => t.ToResponse()).ToList();

            return new ListTasksResponse(totalCount, taskResponses);
        }

        public async Task<TaskResponse> CreateTaskInListAsync(int userId, int listId, TaskCreateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new ArgumentException("Название задачи не может быть пустым.");

            var list = await _db.Lists.FirstOrDefaultAsync(l => l.UserId == userId && l.Id == listId);
            if (list is null)
                throw new KeyNotFoundException($"Список с id {listId} не найден.");

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

            var task = new TaskItem
            {
                UserId = userId,
                ListId = listId,
                Title = request.Title.Trim(),
                Description = request.Description?.Trim(),
                StartAt = request.StartAt,
                EndAt = request.EndAt,
                Deadline = request.Deadline,
                Priority = request.Priority ?? TaskPriority.Low,
                Status = TaskCompletionStatus.InProgress,
                CreatedAt = DateTime.UtcNow
            };

            _db.Tasks.Add(task);
            await _db.SaveChangesAsync();

            task.List = list;
            return task.ToResponse();
        }
    }
}

using Microsoft.EntityFrameworkCore;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Infrastructure.Persistence;
using Tasky.Domain.Entities;
using Tasky.Domain.Enums;
using Tasky.Application.Mappers;
using System.ComponentModel;

namespace Tasky.Infrastructure.Services
{
    public class ListService : IListService
    {
        private readonly AppDbContext _db;

        public ListService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<ListResponse> CreateAsync(int userId, ListCreateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Название списка не может быть пустым.");

            var list = new TaskList
            {
                UserId = userId,
                Name = request.Name.Trim(),
                Color = request.ColorHex,
                CreatedAt = DateTime.UtcNow  // ⬅️ Добавить, если есть поле
            };

            _db.Lists.Add(list);
            await _db.SaveChangesAsync();

            return list.ToResponse();
        }

        public async Task<ListResponse> UpdateAsync(int userId, int listId, ListUpdateRequest request)
        {
            var list = await _db.Lists.FirstOrDefaultAsync(l => l.Id == listId && l.UserId == userId);
            if (list is null)
                throw new KeyNotFoundException("Список задач не найден.");

            if (!string.IsNullOrWhiteSpace(request.Name))
                list.Name = request.Name.Trim();

            if (!string.IsNullOrWhiteSpace(request.ColorHex))
                list.Color = request.ColorHex;

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

        // ⬇️ НУЖНО ДОБАВИТЬ ЭТИ МЕТОДЫ ⬇️

        public async Task<ListTasksResponse> GetListTasksAsync(
            int userId, 
            int listId, 
            int? priority, 
            DateTime? due_date, 
            string? status, 
            int? offset, 
            int? limit, 
            string? sort = "deadline")
        {
            // Проверяем, что список принадлежит пользователю
            var listExists = await _db.Lists.AnyAsync(l => l.UserId == userId && l.Id == listId);
            if (!listExists)
                return new ListTasksResponse(0, Enumerable.Empty<TaskResponse>());

            var query = _db.Tasks
                .Include(t => t.List)
                .Where(t => t.UserId == userId && t.ListId == listId)
                .AsQueryable();

            // Фильтры
            if (priority.HasValue)
                query = query.Where(t => (int)t.Priority == priority.Value);

            if (due_date.HasValue)
                query = query.Where(t => t.Deadline.HasValue && t.Deadline.Value.Date == due_date.Value.Date);

            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<TaskCompletionStatus>(status, true, out var statusEnum))
                    query = query.Where(t => t.Status == statusEnum);
            }

            // Сортировка
            query = sort?.ToLower() switch
            {
                "priority" => query.OrderByDescending(t => t.Priority),
                "created" => query.OrderByDescending(t => t.CreatedAt),
                "title" => query.OrderBy(t => t.Title),
                "status" => query.OrderBy(t => t.Status),
                _ => query.OrderBy(t => t.Deadline)
            };

            // Пагинация
            if (offset.HasValue)
                query = query.Skip(offset.Value);

            if (limit.HasValue)
                query = query.Take(limit.Value);
            else
                query = query.Take(20);

            var tasks = await query.ToListAsync();
            var taskResponses = tasks.Select(t => t.ToResponse()).ToList();
            
            return new ListTasksResponse(taskResponses.Count, taskResponses);
        }

        public async Task<TaskResponse> CreateTaskInListAsync(int userId, int listId, TaskCreateRequest request)
        {
    
            var list = await _db.Lists.FirstOrDefaultAsync(l => l.UserId == userId && l.Id == listId);
            if (list == null)
                throw new KeyNotFoundException($"Список с id {listId} не найден");

            // Валидация дат
            if (request.StartAt.HasValue || request.EndAt.HasValue)
            {
                if (request.Deadline.HasValue)
                    throw new InvalidOperationException("Нельзя указать и Deadline, и StartAt/EndAt");
                
                if (request.StartAt.HasValue && !request.EndAt.HasValue)
                    throw new InvalidOperationException("EndAt обязателен, если указан StartAt");
                
                if (!request.StartAt.HasValue && request.EndAt.HasValue)
                    throw new InvalidOperationException("StartAt обязателен, если указан EndAt");
            }

            var task = new TaskItem 
            {
                UserId = userId,
                ListId = listId,
                Title = request.Title,
                Description = request.Description,
                StartAt = request.StartAt,
                EndAt = request.EndAt,
                Deadline = request.Deadline,
                Priority = request.Priority ?? TaskPriority.Low,
                Status = TaskCompletionStatus.InProgress,
                CreatedAt = DateTime.UtcNow
            };

            _db.Tasks.Add(task);
            await _db.SaveChangesAsync();

            var createdTask = await _db.Tasks
                .Include(t => t.List)
                .FirstOrDefaultAsync(t => t.Id == task.Id);

            return createdTask?.ToResponse() ?? throw new InvalidOperationException("Не удалось создать задачу");
        }
    }
}
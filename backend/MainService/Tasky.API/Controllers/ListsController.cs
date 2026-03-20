using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Domain.Enums;

namespace Tasky.API.Controllers
{
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer")]
    [Route("api/lists")]
    public class ListsController : ControllerBase
    {
        private readonly IListService _listService;

        public ListsController(IListService listService)
        {
            _listService = listService;
        }

        private int UserId => int.Parse(User.FindFirst("userId")?.Value ?? "0");

        // GET /api/lists - все списки
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ListResponse>>> GetAll()
        {
            var lists = await _listService.GetAllAsync(UserId);
            return Ok(lists);
        }

        // POST /api/lists - создание списка
        [HttpPost]
        public async Task<ActionResult<ListResponse>> Create([FromBody] ListCreateRequest request)
        {
            var result = await _listService.CreateAsync(UserId, request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        // GET /api/lists/{id} - получение конкретного списка
        [HttpGet("{id}")]
        public async Task<ActionResult<ListResponse>> GetById(int id)
        {
            var result = await _listService.GetByIdAsync(UserId, id);
            return result is not null ? Ok(result) : NotFound();
        }

        // PATCH /api/lists/{id} - изменение списка
        [HttpPatch("{id}")]
        public async Task<ActionResult<ListResponse>> Update(int id, [FromBody] ListUpdateRequest request)
        {
            var result = await _listService.UpdateAsync(UserId, id, request);
            return Ok(result);
        }

        // DELETE /api/lists/{id} - удаление списка
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var removed = await _listService.DeleteAsync(UserId, id);
            return removed ? NoContent() : NotFound();
        }

        // GET /api/lists/{id}/tasks - возвращает задачи конкретного списка
        [HttpGet("{id}/tasks")]
        public async Task<ActionResult<ListTasksResponse>> GetListTasks(
            int id,
            [FromQuery] string? priority,
            [FromQuery] DateTime? dueDate,
            [FromQuery] string? status,
            [FromQuery] int? offset,
            [FromQuery] int? limit,
            [FromQuery] string? sort)
        {
            if (!string.IsNullOrEmpty(priority) && !Enum.TryParse<TaskPriority>(priority, true, out _))
                return BadRequest($"Недопустимое значение priority: '{priority}'.");

            if (!string.IsNullOrEmpty(status) && !Enum.TryParse<TaskCompletionStatus>(status, true, out _))
                return BadRequest($"Недопустимое значение status: '{status}'.");

            if (offset.HasValue && offset.Value < 0)
                return BadRequest("offset не может быть отрицательным.");

            if (limit.HasValue && (limit.Value < 1 || limit.Value > 500))
                return BadRequest("limit должен быть от 1 до 500.");

            var result = await _listService.GetListTasksAsync(UserId, id, priority, dueDate, status, offset, limit, sort);
            return Ok(result);
        }

        // POST /api/lists/{id}/tasks - создание задачи сразу в список
        [HttpPost("{id}/tasks")]
        public async Task<ActionResult<TaskResponse>> CreateTaskInList(int id, [FromBody] TaskCreateRequest request)
        {
            var result = await _listService.CreateTaskInListAsync(UserId, id, request);
            return CreatedAtAction("GetById", "tasks", new { id = result.Id }, result);
        }
    }
}


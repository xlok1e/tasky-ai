using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;

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
            [FromQuery] int? priority,
            [FromQuery] DateTime? due_date,
            [FromQuery] string? status,
            [FromQuery] int? offset,
            [FromQuery] int? limit)
        {
            var result = await _listService.GetListTasksAsync(UserId, id, priority, due_date, status, offset, limit);
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

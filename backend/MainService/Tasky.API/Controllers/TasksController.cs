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
    [Route("api/tasks")]
    public class TasksController : ControllerBase
    {
        private readonly ITaskService _taskService;

        public TasksController(ITaskService taskService)
        {
            _taskService = taskService;
        }

        private int UserId => int.Parse(User.FindFirst("userId")?.Value ?? "0");

        [HttpPost]
        public async Task<ActionResult<TaskResponse>> Create([FromBody] TaskCreateRequest request)
        {
            var result = await _taskService.CreateAsync(UserId, request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPatch("{id}")]
        public async Task<ActionResult<TaskResponse>> Update(int id, [FromBody] TaskUpdateRequest request)
        {
            var result = await _taskService.UpdateAsync(UserId, id, request);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TaskResponse>> GetById(int id)
        {
            var result = await _taskService.GetByIdAsync(UserId, id);
            return result is not null ? Ok(result) : NotFound();
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskSummaryResponse>>> GetAll(
            [FromQuery] int? listId = null,
            [FromQuery] bool inboxOnly = false,
            [FromQuery] string? priority = null,
            [FromQuery] DateTime? dueDate = null,
            [FromQuery] DateTime? startFrom = null,
            [FromQuery] DateTime? startTo = null,
            [FromQuery] string? status = null,
            [FromQuery] int? offset = null,
            [FromQuery] int? limit = null,
            [FromQuery] string? sort = "deadline",
            [FromQuery] string? dateOrder = null,
            [FromQuery] string? priorityOrder = null)
        {
            TaskPriority? parsedPriority = null;
            if (priority is not null)
            {
                if (!Enum.TryParse<TaskPriority>(priority, ignoreCase: true, out var p))
                    return BadRequest(new { error = $"Недопустимое значение priority '{priority}'. Допустимые: {string.Join(", ", Enum.GetNames<TaskPriority>())}" });
                parsedPriority = p;
            }

            TaskCompletionStatus? parsedStatus = null;
            if (status is not null)
            {
                if (!Enum.TryParse<TaskCompletionStatus>(status, ignoreCase: true, out var s))
                    return BadRequest(new { error = $"Недопустимое значение status '{status}'. Допустимые: {string.Join(", ", Enum.GetNames<TaskCompletionStatus>())}" });
                parsedStatus = s;
            }

            if (offset.HasValue && offset.Value < 0)
                return BadRequest(new { error = "offset должен быть >= 0." });

            if (limit.HasValue && (limit.Value <= 0 || limit.Value > 500))
                return BadRequest(new { error = "limit должен быть в диапазоне от 1 до 500." });

            if (!IsValidSortDirection(dateOrder))
                return BadRequest(new { error = "dateOrder должен быть 'asc' или 'desc'." });

            if (!IsValidSortDirection(priorityOrder))
                return BadRequest(new { error = "priorityOrder должен быть 'asc' или 'desc'." });

            var list = await _taskService.GetAllAsync(
                UserId,
                listId,
                inboxOnly,
                parsedPriority,
                dueDate,
                startFrom,
                startTo,
                parsedStatus,
                offset,
                limit,
                sort,
                dateOrder,
                priorityOrder);
            return Ok(list);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var removed = await _taskService.DeleteAsync(UserId, id);
            return removed ? NoContent() : NotFound();
        }

        private static bool IsValidSortDirection(string? direction)
        {
            return direction is null
                   || direction.Equals("asc", StringComparison.OrdinalIgnoreCase)
                   || direction.Equals("desc", StringComparison.OrdinalIgnoreCase);
        }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;

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

        [HttpPut("{id}")]
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
        public async Task<ActionResult<IEnumerable<TaskResponse>>> GetAll()
        {
            var list = await _taskService.GetAllAsync(UserId);
            return Ok(list);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var removed = await _taskService.DeleteAsync(UserId, id);
            return removed ? NoContent() : NotFound();
        }
    }
}
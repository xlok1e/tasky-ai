using Microsoft.AspNetCore.Mvc;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Swashbuckle.AspNetCore.Annotations;

namespace Tasky.API.Controllers
{
	[ApiController]
	[Authorize(AuthenticationSchemes = "Bearer")]
	[Route("api/ai-assistant")]
	public class AiController : ControllerBase
	{
		private readonly IAiAssistantService _aiService;
		private readonly ILogger<AiController> _logger;

		public AiController(IAiAssistantService aiService, ILogger<AiController> logger)
		{
			_aiService = aiService;
			_logger = logger;
		}

		[HttpPost("chat")]
		public async Task<ActionResult<AiChatResponse>> Chat([FromBody] AiChatRequest request)
		{
			if (string.IsNullOrWhiteSpace(request?.Message))
				return BadRequest("Message is required");

			var userId = GetUserId();
			if (userId is null) return Unauthorized();

			var result = await _aiService.ChatAsync(userId.Value, request.Message);

			return Ok(result);
		}

		[HttpPost("confirm-task")]
		public async Task<ActionResult<TaskConfirmResponse>> ConfirmTask([FromBody] AiConfirmTaskRequest request)
		{
			if (request.Task is null) return BadRequest("Task data is required");

			var userId = GetUserId();
			if (userId is null) return Unauthorized();

			var taskId = await _aiService.ConfirmTaskAsync(userId.Value, request.Task);

			return Ok(new TaskConfirmResponse { TaskId = taskId, Title = request.Task.Title });
		}

		[HttpPost("confirm-tasks")]
		public async Task<ActionResult<TasksBatchConfirmResponse>> ConfirmTasks([FromBody] AiConfirmTasksRequest request)
		{
			if (request.Tasks is not { Count: > 0 })
				return BadRequest("At least one task is required");

			var userId = GetUserId();
			if (userId is null) return Unauthorized();

			var createdIds = await _aiService.ConfirmTasksAsync(userId.Value, request.Tasks);

			var tasks = createdIds
				.Zip(request.Tasks, (id, pending) => new TaskConfirmResponse { TaskId = id, Title = pending.Title })
				.ToList();

			return Ok(new TasksBatchConfirmResponse { Tasks = tasks });
		}

		[HttpPost("confirm-update")]
		public async Task<ActionResult<TaskResponse>> ConfirmUpdate([FromBody] AiConfirmUpdateRequest request)
		{
			if (request.Update is null) return BadRequest("Update data is required");

			var userId = GetUserId();
			if (userId is null) return Unauthorized();

			var result = await _aiService.ConfirmUpdateAsync(userId.Value, request.Update);
			return Ok(result);
		}

		[HttpPost("confirm-delete")]
		public async Task<IActionResult> ConfirmDelete([FromBody] AiConfirmDeleteRequest request)
		{
			var userId = GetUserId();
			if (userId is null) return Unauthorized();

			var deleted = await _aiService.ConfirmDeleteAsync(userId.Value, request.TaskId);
			return deleted ? NoContent() : NotFound();
		}

		[HttpGet("history")]
		[ProducesResponseType(typeof(AiConversationHistoryListResponse), StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[SwaggerOperation(Summary = "Получить историю диалога с ИИ-ассистентом", Description = "Возвращает историю сообщений пользователя с ИИ-ассистентом с поддержкой пагинации")]
		public async Task<ActionResult<AiConversationHistoryListResponse>> GetHistory([FromQuery] int page = 1, [FromQuery] int limit = 20)
		{
			if (page < 1) page = 1;
			if (limit < 1 || limit > 100) limit = 20;

			var userId = GetUserId();
			if (userId is null) return Unauthorized();

			var result = await _aiService.GetHistoryAsync(userId.Value, page, limit);
			return Ok(result);
		}

		private int? GetUserId()
		{
			var claim = User.FindFirstValue("userId");
			return int.TryParse(claim, out var id) ? id : null;
		}
	}
}

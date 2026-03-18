using Microsoft.AspNetCore.Mvc;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

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

		private int? GetUserId()
		{
			var claim = User.FindFirstValue("userId");
      return int.TryParse(claim, out var id) ? id : null;
		}
	}
}

using Microsoft.AspNetCore.Mvc;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;

namespace Tasky.API.Controllers
{
    [ApiController]
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

            _logger.LogInformation("AI chat request: {Message}", request.Message);

            var reply = await _aiService.ChatAsync(request.Message);

            return Ok(new AiChatResponse { Reply = reply });
        }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;

namespace Tasky.API.Controllers
{
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer")]
    [Route("api/analytics")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _analyticsService;

        public AnalyticsController(IAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        private int UserId => int.Parse(User.FindFirst("userId")?.Value ?? "0");

        [HttpPost]
        public async Task<ActionResult<TaskAnalyticsResponse>> GetAnalytics([FromBody] TaskAnalyticsRequest request)
        {
            if (request.StartDate >= request.EndDate)
                return BadRequest(new { error = "StartDate должен быть раньше EndDate." });

            var result = await _analyticsService.GetAnalyticsAsync(UserId, request);
            return Ok(result);
        }
    }
}
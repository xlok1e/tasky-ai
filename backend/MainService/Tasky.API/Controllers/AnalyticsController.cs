using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;

namespace Tasky.API.Controllers
{
    [ApiController]
    [Authorize(AuthenticationSchemes = "Bearer")]
    [Route("api/analytics")]
    [SwaggerTag("Аналитика и статистика задач")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _analyticsService;

        public AnalyticsController(IAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        private int UserId => int.Parse(User.FindFirst("userId")?.Value ?? "0");

        [HttpPost]
        [ProducesResponseType(typeof(TaskAnalyticsResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [SwaggerOperation(
            Summary = "Получить аналитику задач",
            Description = """
                Возвращает статистику задач за выбранный период.
                
                Гистограмма адаптируется под длину периода:
                - **День** (≤ 1 дня) — почасовая разбивка. Метки: "09:00", "14:00"
                - **Неделя** (> 1 дня, ≤ 7 дней) — по дням диапазона. Метки: "Пн, 25.03"
                - **Месяц** (> 7 дней, ≤ 31 дня) — по дням месяца. Метки: "1", "2", ... "31"
                - **Год** (> 31 дня) — по месяцам. Метки: "Январь" (один год) или "Январь 2025" (несколько лет)
                
                Все точки диапазона включаются в гистограмму, даже если задач в этот период не было (значение 0).
            """
        )]
        public async Task<ActionResult<TaskAnalyticsResponse>> GetAnalytics([FromBody] TaskAnalyticsRequest request)
        {
            if (request.StartDate >= request.EndDate)
                return BadRequest(new { error = "StartDate должен быть раньше EndDate." });

            var result = await _analyticsService.GetAnalyticsAsync(UserId, request);
            return Ok(result);
        }
    }
}

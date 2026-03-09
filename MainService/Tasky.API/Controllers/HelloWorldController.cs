using Microsoft.AspNetCore.Mvc;

namespace Tasky.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HelloWorldController : ControllerBase
{
    /// <summary>
    /// Простой эндпоинт для проверки работоспособности API
    /// </summary>
    /// <returns>Возвращает строку "Hello World"</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<string> Get()
    {
        return Ok("Hello World");
    }
}

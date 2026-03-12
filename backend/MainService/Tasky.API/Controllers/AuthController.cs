using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Domain.Entities;
using Tasky.Infrastructure.Persistence;
using Swashbuckle.AspNetCore.Annotations;

namespace Tasky.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[SwaggerTag("Telegram Bot Authentication endpoints")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;

    public AuthController(AppDbContext dbContext, IJwtService jwtService, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _jwtService = jwtService;
        _configuration = configuration;
    }

    [HttpPost("telegram-bot-link")]
    [ProducesResponseType(typeof(TelegramBotLinkResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [SwaggerOperation(Summary = "Получить ссылку на Telegram бота", Description = "Создает токен и возвращает готовую ссылку для авторизации")]
    public async Task<ActionResult<TelegramBotLinkResponse>> CreateTelegramBotLink()
    {
        var token = Guid.NewGuid().ToString("N");
        var auth = new TelegramAuthToken
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = false,
            PhoneNumber = null
        };
        _dbContext.TelegramAuthTokens.Add(auth);
        await _dbContext.SaveChangesAsync();

        var botUsername = _configuration["Telegram:BotUsername"];
        if (string.IsNullOrEmpty(botUsername))
        {
            return BadRequest("Bot username not configured in appsettings.json");
        }

        var botLink = $"https://t.me/{botUsername}?start={token}";
        return Ok(new TelegramBotLinkResponse(botLink));
    }

    [HttpPost("login-with-token")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [SwaggerOperation(Summary = "Обменять Telegram токен на JWT", Description = "Получить JWT после успешной авторизации в Telegram боте")]
    public async Task<ActionResult<string>> LoginWithToken([FromBody] TelegramAuthRequest request)
    {
        var auth = await _dbContext.TelegramAuthTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == request.Token);

        if (auth is null)
            return NotFound("Token not found");

        if (!auth.IsUsed)
            return BadRequest("Token has not been used via Telegram yet");

        if (auth.ExpiresAt < DateTime.UtcNow)
            return BadRequest("Token has expired");

        if (auth.User is null)
            return BadRequest("No user associated with the token");

        _dbContext.TelegramAuthTokens.Remove(auth);
        await _dbContext.SaveChangesAsync();

        var jwt = _jwtService.GenerateToken(auth.User);
        return Ok(jwt);
    }

    [HttpGet("telegram-token/{token}")]
    [ProducesResponseType(typeof(TelegramTokenStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [SwaggerOperation(Summary = "Проверить статус Telegram токена", Description = "Возвращает информацию о статусе токена авторизации")]
    public async Task<ActionResult<TelegramTokenStatusResponse>> GetTokenStatus(string token)
    {
        var auth = await _dbContext.TelegramAuthTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == token);

        if (auth is null)
            return NotFound();

        return Ok(new TelegramTokenStatusResponse(auth.IsUsed, auth.User?.Username));
    }
}

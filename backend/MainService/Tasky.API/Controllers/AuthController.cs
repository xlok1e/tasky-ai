using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tasky.Domain.Entities;
using Tasky.Infrastructure.Persistence;
using Tasky.Application.Interfaces;

namespace Tasky.API.Controllers;

[ApiController]
[Route("api/[controller]")]
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

    /// <summary>
    /// Создаеться одноразовый токет дял входа через ТГ бота.Токен гененрируеться в веб-приложении
    /// После привязски токена к бользователю в боте, токен истекает.
    /// </summary>
    /// <returns>Возвращает строку с токеном для входа через ТГ бот
    [HttpPost("telegram-token")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<string>> CreateTelegramToken()
    {
        var token = Guid.NewGuid().ToString("N");
        var auth = new TelegramAuthToken
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = false
        };
        _dbContext.TelegramAuthTokens.Add(auth);
        await _dbContext.SaveChangesAsync();

        return Ok(token);
    }

    [HttpPost("telegram-bot-link")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<string>> CreateTelegramBotLink()
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
        return Ok(botLink);
    }

    /// <summary>
    /// После отправки токена подльзователем в боте, тот помечаться как ипсользованный и привязываеться к пользователю
    /// Эндпоинт для получения JWT токена после успешного входа через ТГ бот.
    /// </summary>
    /// <returns>Возвращает JWT токен для доступа к API
    [HttpPost("login-with-token")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<string>> LoginWithToken([FromBody] TokenRequest request)
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

    /// <summary>
    /// Вспомогательный эндпоинт для проверки статуса токена, используется в боте для информирования пользователя о статусе токенa
    /// </summary>
    [HttpGet("telegram-token/{token}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TokenStatus>> GetTokenStatus(string token)
    {
        var auth = await _dbContext.TelegramAuthTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == token);

        if (auth is null)
            return NotFound();

        return Ok(new TokenStatus
        {
            IsUsed = auth.IsUsed,
            Username = auth.User?.Username
        });
    }

    public class TokenRequest
    {
        public string Token { get; set; } = string.Empty;
    }

    public class TokenStatus
    {
        public bool IsUsed { get; set; }
        public string? Username { get; set; }
    }
}

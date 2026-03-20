using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Domain.Entities;
using Tasky.Domain.Enums;
using Tasky.Infrastructure.Persistence;

namespace Tasky.API.Controllers;

[ApiController]
[Authorize(AuthenticationSchemes = "Bearer")]
[Route("api/google")]
public class GoogleController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IGoogleCalendarService _googleCalendar;
    private readonly IConfiguration _config;

    public GoogleController(AppDbContext db, IGoogleCalendarService googleCalendar, IConfiguration config)
    {
        _db = db;
        _googleCalendar = googleCalendar;
        _config = config;
    }

    private int UserId => int.Parse(User.FindFirstValue("userId") ?? "0");

    [HttpGet("status")]
    [ProducesResponseType(typeof(GoogleStatusResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<GoogleStatusResponse>> GetStatus()
    {
        var state = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == UserId);
        if (state is null)
            return Ok(new GoogleStatusResponse(false, null, null));

        return Ok(new GoogleStatusResponse(true, state.GoogleCalendarId, state.LastSyncAt));
    }

    [HttpGet("auth")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public IActionResult StartAuth([FromQuery] string? redirectUri)
    {
        var clientId = _config["Google:ClientId"]
            ?? throw new InvalidOperationException("Google:ClientId is not configured.");
        var callbackUri = _config["Google:RedirectUri"]
            ?? throw new InvalidOperationException("Google:RedirectUri is not configured.");

        var state = $"{UserId}:{redirectUri ?? string.Empty}";
        var stateEncoded = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(state));

        var authUrl = new Uri("https://accounts.google.com/o/oauth2/v2/auth")
            .AddQuery("client_id", clientId)
            .AddQuery("redirect_uri", callbackUri)
            .AddQuery("response_type", "code")
            .AddQuery("scope", "https://www.googleapis.com/auth/calendar")
            .AddQuery("access_type", "offline")
            .AddQuery("prompt", "consent")
            .AddQuery("state", stateEncoded)
            .ToString();

        return Ok(new { authUrl });
    }

    [HttpGet("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback([FromQuery] string code, [FromQuery] string state)
    {
        if (string.IsNullOrWhiteSpace(code))
            return BadRequest("OAuth code is missing.");

        string stateDecoded;
        try
        {
            stateDecoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(state));
        }
        catch
        {
            return BadRequest("Invalid state parameter.");
        }

        var parts = stateDecoded.Split(':', 2);
        if (!int.TryParse(parts[0], out var userId))
            return BadRequest("Invalid state parameter.");

        var frontendRedirect = parts.Length > 1 ? parts[1] : null;

        var clientId = _config["Google:ClientId"]!;
        var clientSecret = _config["Google:ClientSecret"]!;
        var callbackUri = _config["Google:RedirectUri"]!;

        var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new Google.Apis.Auth.OAuth2.ClientSecrets
            {
                ClientId = clientId,
                ClientSecret = clientSecret
            },
            Scopes = [CalendarService.Scope.Calendar]
        });

        TokenResponse tokenResponse;
        try
        {
            tokenResponse = await flow.ExchangeCodeForTokenAsync(
                userId.ToString(), code, callbackUri, CancellationToken.None);
        }
        catch (Exception ex)
        {
            return BadRequest($"Failed to exchange OAuth code: {ex.Message}");
        }

        var existing = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == userId);
        if (existing is null)
        {
            existing = new GoogleSyncState { UserId = userId };
            _db.GoogleSyncStates.Add(existing);
        }

        existing.AccessToken = tokenResponse.AccessToken!;
        existing.RefreshToken = tokenResponse.RefreshToken ?? existing.RefreshToken;
        existing.TokenExpiresAt = tokenResponse.IssuedUtc.AddSeconds(tokenResponse.ExpiresInSeconds ?? 3600);

        var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        if (settings is not null)
            settings.UseBuiltinCalendar = false;

        await _db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(frontendRedirect))
            return Redirect(frontendRedirect);

        return Ok(new { message = "Google Calendar connected successfully." });
    }

    [HttpPost("sync")]
    [ProducesResponseType(typeof(GoogleSyncResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<GoogleSyncResponse>> Sync()
    {
        var state = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == UserId);
        if (state is null)
            return BadRequest(new { error = "Google Calendar не подключён." });

        await _googleCalendar.RefreshTokenIfNeededAsync(state);

        var calendarService = BuildCalendarService(state.AccessToken);
        var calendarId = state.GoogleCalendarId ?? "primary";

        var unpushedTasks = await _db.Tasks
            .Where(t => t.UserId == UserId && t.GoogleEventId == null)
            .ToListAsync();

        var pushedCount = 0;
        foreach (var task in unpushedTasks)
        {
            try
            {
                task.GoogleEventId = await _googleCalendar.CreateEventAsync(state, task);
                pushedCount++;
            }
            catch
            {
            }
        }

        if (pushedCount > 0)
            await _db.SaveChangesAsync();

        var listRequest = calendarService.Events.List(calendarId);
        listRequest.SingleEvents = true;
        listRequest.OrderBy = EventsResource.ListRequest.OrderByEnum.StartTime;
        if (state.LastSyncAt.HasValue)
            listRequest.UpdatedMinDateTimeOffset = state.LastSyncAt.Value;

        Events events;
        try
        {
            events = await listRequest.ExecuteAsync();
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = $"Ошибка Google Calendar API: {ex.Message}" });
        }

        var createdCount = 0;
        var updatedCount = 0;

        foreach (var ev in events.Items ?? [])
        {
            if (ev.Status == "cancelled") continue;

            var existing = await _db.Tasks
                .FirstOrDefaultAsync(t => t.UserId == UserId && t.GoogleEventId == ev.Id);

            var (startAt, endAt, isAllDay) = ParseEventTimes(ev);

            if (existing is null)
            {
                _db.Tasks.Add(new TaskItem
                {
                    UserId = UserId,
                    Title = ev.Summary ?? "(без названия)",
                    Description = ev.Description,
                    GoogleEventId = ev.Id,
                    StartAt = startAt,
                    EndAt = endAt,
                    IsAllDay = isAllDay,
                    Priority = TaskPriority.Low,
                    Status = TaskCompletionStatus.InProgress,
                    CreatedAt = DateTime.UtcNow
                });
                createdCount++;
            }
            else
            {
                existing.Title = ev.Summary ?? existing.Title;
                existing.Description = ev.Description;
                existing.StartAt = startAt;
                existing.EndAt = endAt;
                existing.IsAllDay = isAllDay;
                updatedCount++;
            }
        }

        state.LastSyncAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var pulled = createdCount + updatedCount;
        var total = pushedCount + pulled;
        return Ok(new GoogleSyncResponse(total, createdCount, updatedCount,
            $"Загружено из Google: {pulled} ({createdCount} новых, {updatedCount} обновлено). Отправлено в Google: {pushedCount}."));
    }

    [HttpDelete("disconnect")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Disconnect()
    {
        var state = await _db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == UserId);
        if (state is not null)
            _db.GoogleSyncStates.Remove(state);

        var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == UserId);
        if (settings is not null)
            settings.UseBuiltinCalendar = true;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static CalendarService BuildCalendarService(string accessToken) =>
        new(new BaseClientService.Initializer
        {
            HttpClientInitializer = Google.Apis.Auth.OAuth2.GoogleCredential
                .FromAccessToken(accessToken)
                .CreateScoped(CalendarService.Scope.Calendar),
            ApplicationName = "Tasky"
        });

    private static (DateTime? startAt, DateTime? endAt, bool isAllDay) ParseEventTimes(Event ev)
    {
        if (ev.Start?.Date is not null)
        {
            var date = DateTime.Parse(ev.Start.Date, null, System.Globalization.DateTimeStyles.AssumeUniversal);
            return (DateTime.SpecifyKind(date, DateTimeKind.Utc), null, true);
        }

        var start = ev.Start?.DateTimeDateTimeOffset?.UtcDateTime;
        var end = ev.End?.DateTimeDateTimeOffset?.UtcDateTime;
        return (start, end, false);
    }
}

internal static class UriExtensions
{
    internal static Uri AddQuery(this Uri uri, string name, string value)
    {
        var uriBuilder = new UriBuilder(uri);
        var query = System.Web.HttpUtility.ParseQueryString(uriBuilder.Query);
        query[name] = value;
        uriBuilder.Query = query.ToString();
        return uriBuilder.Uri;
    }
}

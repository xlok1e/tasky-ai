using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Tasky.Application.Interfaces;
using Tasky.Domain.Entities;
using Tasky.Infrastructure.Persistence;

namespace Tasky.Infrastructure.ExternalServices;

public class GoogleCalendarService : IGoogleCalendarService
{
    private readonly AppDbContext _db;
    private readonly string _clientId;
    private readonly string _clientSecret;

    public GoogleCalendarService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _clientId = config["Google:ClientId"]
            ?? throw new InvalidOperationException("Google:ClientId is not configured.");
        _clientSecret = config["Google:ClientSecret"]
            ?? throw new InvalidOperationException("Google:ClientSecret is not configured.");
    }

    public async Task<bool> IsConnectedAsync(int userId)
    {
        return await _db.GoogleSyncStates.AnyAsync(g => g.UserId == userId);
    }

    public async Task RefreshTokenIfNeededAsync(GoogleSyncState state)
    {
        if (state.TokenExpiresAt > DateTime.UtcNow.AddMinutes(5))
            return;

        var flow = BuildFlow();
        var tokenResponse = new TokenResponse
        {
            RefreshToken = state.RefreshToken
        };

        var credential = new UserCredential(flow, state.UserId.ToString(), tokenResponse);
        await credential.RefreshTokenAsync(CancellationToken.None);

        state.AccessToken = credential.Token.AccessToken!;
        state.TokenExpiresAt = credential.Token.IssuedUtc
            .AddSeconds(credential.Token.ExpiresInSeconds ?? 3600);

        await _db.SaveChangesAsync();
    }

    public async Task<string> CreateEventAsync(GoogleSyncState state, TaskItem task)
    {
        var service = BuildCalendarService(state.AccessToken);
        var calendarId = state.GoogleCalendarId ?? "primary";

        var @event = MapTaskToEvent(task);
        var request = service.Events.Insert(@event, calendarId);
        var created = await request.ExecuteAsync();
        return created.Id;
    }

    public async Task UpdateEventAsync(GoogleSyncState state, string googleEventId, TaskItem task)
    {
        var service = BuildCalendarService(state.AccessToken);
        var calendarId = state.GoogleCalendarId ?? "primary";

        var @event = MapTaskToEvent(task);
        var request = service.Events.Update(@event, calendarId, googleEventId);
        await request.ExecuteAsync();
    }

    public async Task DeleteEventAsync(GoogleSyncState state, string googleEventId)
    {
        var service = BuildCalendarService(state.AccessToken);
        var calendarId = state.GoogleCalendarId ?? "primary";

        var request = service.Events.Delete(calendarId, googleEventId);
        await request.ExecuteAsync();
    }

    private GoogleAuthorizationCodeFlow BuildFlow() =>
        new(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new ClientSecrets
            {
                ClientId = _clientId,
                ClientSecret = _clientSecret
            },
            Scopes = [CalendarService.Scope.Calendar]
        });

    private static CalendarService BuildCalendarService(string accessToken) =>
        new(new BaseClientService.Initializer
        {
            HttpClientInitializer = GoogleCredential
                .FromAccessToken(accessToken)
                .CreateScoped(CalendarService.Scope.Calendar),
            ApplicationName = "Tasky"
        });

    private static Event MapTaskToEvent(TaskItem task)
    {
        var @event = new Event
        {
            Summary = task.Title,
            Description = task.Description
        };

        if (task.IsAllDay)
        {
            var date = (task.StartAt ?? DateTime.UtcNow).Date;
            @event.Start = new EventDateTime { Date = date.ToString("yyyy-MM-dd") };
            @event.End = new EventDateTime { Date = date.AddDays(1).ToString("yyyy-MM-dd") };
        }
        else if (task.StartAt.HasValue)
        {
            @event.Start = new EventDateTime { DateTimeDateTimeOffset = task.StartAt.Value };
            @event.End = new EventDateTime
            {
                DateTimeDateTimeOffset = task.EndAt ?? task.StartAt.Value.AddHours(1)
            };
        }
        else if (task.Deadline.HasValue)
        {
            @event.Start = new EventDateTime { DateTimeDateTimeOffset = task.Deadline.Value };
            @event.End = new EventDateTime { DateTimeDateTimeOffset = task.Deadline.Value.AddHours(1) };
        }
        else
        {
            var now = DateTime.UtcNow;
            @event.Start = new EventDateTime { DateTimeDateTimeOffset = now };
            @event.End = new EventDateTime { DateTimeDateTimeOffset = now.AddHours(1) };
        }

        return @event;
    }
}

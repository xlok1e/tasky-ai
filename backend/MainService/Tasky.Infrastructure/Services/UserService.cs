using Microsoft.EntityFrameworkCore;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Infrastructure.Persistence;

namespace Tasky.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<UserProfileResponse?> GetProfileAsync(int userId)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
            return null;

        return new UserProfileResponse(
            user.Id,
            user.Username,
            user.PhoneNumber,
            user.CreatedAt
        );
    }

    public async Task<UserSettingsResponse?> GetSettingsAsync(int userId)
    {
        var settings = await _db.UserSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (settings is null)
            return null;

        return new UserSettingsResponse(
            settings.WorkDayStart,
            settings.WorkDayEnd,
            settings.TimeZone,
            settings.MorningNotificationsEnabled,
            settings.MorningNotificationTime,
            settings.EveningNotificationsEnabled,
            settings.EveningNotificationTime,
            settings.UseBuiltinCalendar,
            settings.OnboardingCompleted
        );
    }

    public async Task<UserSettingsResponse?> UpdateSettingsAsync(int userId, UpdateUserSettingsRequest request)
    {
        var settings = await _db.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (settings is null)
            return null;

        if (request.WorkDayStart.HasValue)
            settings.WorkDayStart = request.WorkDayStart.Value;

        if (request.WorkDayEnd.HasValue)
            settings.WorkDayEnd = request.WorkDayEnd.Value;

        if (!string.IsNullOrWhiteSpace(request.TimeZone))
            settings.TimeZone = request.TimeZone;

        if (request.MorningNotificationsEnabled.HasValue)
            settings.MorningNotificationsEnabled = request.MorningNotificationsEnabled.Value;

        if (request.MorningNotificationTime.HasValue)
            settings.MorningNotificationTime = request.MorningNotificationTime.Value;

        if (request.EveningNotificationsEnabled.HasValue)
            settings.EveningNotificationsEnabled = request.EveningNotificationsEnabled.Value;

        if (request.EveningNotificationTime.HasValue)
            settings.EveningNotificationTime = request.EveningNotificationTime.Value;

        if (request.UseBuiltinCalendar.HasValue)
            settings.UseBuiltinCalendar = request.UseBuiltinCalendar.Value;

        if (request.OnboardingCompleted.HasValue)
            settings.OnboardingCompleted = request.OnboardingCompleted.Value;

        _db.UserSettings.Update(settings);
        await _db.SaveChangesAsync();

        return new UserSettingsResponse(
            settings.WorkDayStart,
            settings.WorkDayEnd,
            settings.TimeZone,
            settings.MorningNotificationsEnabled,
            settings.MorningNotificationTime,
            settings.EveningNotificationsEnabled,
            settings.EveningNotificationTime,
            settings.UseBuiltinCalendar,
            settings.OnboardingCompleted
        );
    }
}

namespace Tasky.Application.DTOs.Requests;

public record UpdateUserSettingsRequest(
    TimeOnly? WorkDayStart = null,
    TimeOnly? WorkDayEnd = null,
    string? TimeZone = null,
    bool? MorningNotificationsEnabled = null,
    TimeOnly? MorningNotificationTime = null,
    bool? EveningNotificationsEnabled = null,
    TimeOnly? EveningNotificationTime = null,
    bool? UseBuiltinCalendar = null
);

namespace Tasky.Application.DTOs.Responses;

public record UserSettingsResponse(
    TimeOnly WorkDayStart,
    TimeOnly WorkDayEnd,
    string TimeZone,
    bool MorningNotificationsEnabled,
    TimeOnly MorningNotificationTime,
    bool EveningNotificationsEnabled,
    TimeOnly EveningNotificationTime,
    bool UseBuiltinCalendar
);

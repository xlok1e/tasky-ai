namespace Tasky.Domain.Entities;

public class UserSettings
{
    public int Id { get; set; }
    public int UserId { get; set; }

    public TimeOnly WorkDayStart { get; set; } = new TimeOnly(9, 0);
    public TimeOnly WorkDayEnd { get; set; } = new TimeOnly(19, 0);
    public string TimeZone { get; set; } = "Europe/Moscow";

    public bool MorningNotificationsEnabled { get; set; } = true;
    public TimeOnly MorningNotificationTime { get; set; } = new TimeOnly(9, 0);
    public bool EveningNotificationsEnabled { get; set; } = true;
    public TimeOnly EveningNotificationTime { get; set; } = new TimeOnly(19, 0);

    public bool UseBuiltinCalendar {get; set;} = true;
    public bool OnboardingCompleted { get; set; } = false;

    public User User { get; set; } = null!;
}

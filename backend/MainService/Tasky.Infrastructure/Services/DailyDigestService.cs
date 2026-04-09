using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Telegram.Bot;
using Tasky.Domain.Enums;
using Tasky.Infrastructure.Persistence;

namespace Tasky.Infrastructure.Services;

public class DailyDigestService(
    IServiceScopeFactory scopeFactory,
    ITelegramBotClient botClient,
    ILogger<DailyDigestService> logger) : BackgroundService
{
    private static readonly TimeSpan PollingInterval = TimeSpan.FromSeconds(30);

    private static readonly string[] MorningWishes =
    [
        "Продуктивного дня! 💪",
        "Удачного и плодотворного дня! ✨",
        "Пусть день будет максимально эффективным! 🚀",
        "Отличного дня и хорошего настроения! ☀️",
        "Пусть все задачи будут по плечу! 🎯",
        "Энергичного и успешного дня! ⚡",
        "Пусть сегодня всё получится! 🌟",
        "Вперёд к новым свершениям! 🏆",
        "Сегодня — отличный день для великих дел! 🔥",
        "Желаю лёгкого и продуктивного дня! 💫"
    ];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Daily digest service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessDigestsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Error processing daily digests");
            }

            await Task.Delay(PollingInterval, stoppingToken);
        }
    }

    private async Task ProcessDigestsAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var nowUtc = DateTime.UtcNow;

        var users = await db.Users
            .Include(u => u.Settings)
            .Where(u => u.TelegramId != 0 && u.Settings != null)
            .ToListAsync(ct);

        foreach (var user in users)
        {
            var settings = user.Settings!;
            var tz = FindTimeZone(settings.TimeZone);
            if (tz is null) continue;

            var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

            if (settings.MorningNotificationsEnabled)
                await TryProcessDigestAsync(db, user, settings, tz, localNow,
                    NotificationType.Morning, settings.MorningNotificationTime, ct);

            if (settings.EveningNotificationsEnabled)
                await TryProcessDigestAsync(db, user, settings, tz, localNow,
                    NotificationType.Evening, settings.EveningNotificationTime, ct);
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task TryProcessDigestAsync(
        AppDbContext db,
        Domain.Entities.User user,
        Domain.Entities.UserSettings settings,
        TimeZoneInfo tz,
        DateTime localNow,
        NotificationType type,
        TimeOnly scheduledTime,
        CancellationToken ct)
    {
        var localToday = localNow.Date;
        var scheduledLocal = localToday.Add(scheduledTime.ToTimeSpan());
        var scheduledUtc = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(scheduledLocal, DateTimeKind.Unspecified), tz);

        // Only fire if we're within the polling window (now >= scheduled && now < scheduled + 1 min)
        var nowUtc = DateTime.UtcNow;
        if (nowUtc < scheduledUtc || nowUtc >= scheduledUtc.AddMinutes(1))
            return;

        // Check if already sent today
        var alreadySent = await db.NotificationsQueue.AnyAsync(n =>
            n.UserId == user.Id
            && n.Type == type
            && n.IsSent
            && n.SentAt != null
            && n.SentAt >= scheduledUtc.AddMinutes(-2)
            && n.SentAt <= scheduledUtc.AddMinutes(5), ct);

        if (alreadySent) return;

        try
        {
            if (type == NotificationType.Morning)
                await SendMorningDigestAsync(db, user, tz, localNow, ct);
            else
                await SendEveningDigestAsync(db, user, tz, localNow, ct);

            db.NotificationsQueue.Add(new Domain.Entities.NotificationQueue
            {
                UserId = user.Id,
                TaskId = null,
                Type = type,
                ScheduledAt = scheduledUtc,
                IsSent = true,
                SentAt = DateTime.UtcNow
            });

            logger.LogInformation("Sent {Type} digest to user {UserId}", type, user.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send {Type} digest to user {UserId}", type, user.Id);
        }
    }

    private async Task SendMorningDigestAsync(
        AppDbContext db,
        Domain.Entities.User user,
        TimeZoneInfo tz,
        DateTime localNow,
        CancellationToken ct)
    {
        var todayStart = localNow.Date;
        var todayEnd = todayStart.AddDays(1);

        var utcTodayStart = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(todayStart, DateTimeKind.Unspecified), tz);
        var utcTodayEnd = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(todayEnd, DateTimeKind.Unspecified), tz);

        var tasks = await db.Tasks
            .Include(t => t.List)
            .Where(t => t.UserId == user.Id
                && t.Status == TaskCompletionStatus.InProgress
                && t.StartAt != null
                && t.StartAt >= utcTodayStart
                && t.StartAt < utcTodayEnd)
            .OrderBy(t => t.StartAt)
            .ToListAsync(ct);

        string message;

        if (tasks.Count == 0)
        {
            message = "☀️ Доброе утро!\n\n"
                + "Кажется, вы ничего не запланировали на сегодня. Исправим это?";
        }
        else
        {
            var sb = new System.Text.StringBuilder();
            sb.AppendLine($"☀️ Доброе утро! На сегодня у вас {FormatTaskCount(tasks.Count)}:");
            sb.AppendLine();

            foreach (var task in tasks)
            {
                var localStart = TimeZoneInfo.ConvertTimeFromUtc(task.StartAt!.Value, tz);
                var timeLabel = task.IsAllDay ? "Весь день" : localStart.ToString("HH:mm");
                var priorityEmoji = task.Priority switch
                {
                    TaskPriority.High => "🔴",
                    TaskPriority.Medium => "🟡",
                    TaskPriority.Low => "🟢",
                    _ => "⚪"
                };
                var listName = task.List?.Name ?? "Входящие";

                sb.AppendLine($"{priorityEmoji} {task.Title}");
                sb.AppendLine($"⏰ {timeLabel} · 📂 {listName}");
            }

            sb.AppendLine();
            sb.Append(MorningWishes[Random.Shared.Next(MorningWishes.Length)]);
            message = sb.ToString();
        }

        await botClient.SendMessage(user.TelegramId, message, cancellationToken: ct);
    }

    private async Task SendEveningDigestAsync(
        AppDbContext db,
        Domain.Entities.User user,
        TimeZoneInfo tz,
        DateTime localNow,
        CancellationToken ct)
    {
        var todayStart = localNow.Date;
        var todayEnd = todayStart.AddDays(1);

        var utcTodayStart = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(todayStart, DateTimeKind.Unspecified), tz);
        var utcTodayEnd = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(todayEnd, DateTimeKind.Unspecified), tz);

        var allTodayTasks = await db.Tasks
            .Include(t => t.List)
            .Where(t => t.UserId == user.Id
                && t.StartAt != null
                && t.StartAt >= utcTodayStart
                && t.StartAt < utcTodayEnd)
            .OrderBy(t => t.StartAt)
            .ToListAsync(ct);

        var totalCount = allTodayTasks.Count;
        var completedCount = allTodayTasks.Count(t => t.Status == TaskCompletionStatus.Completed);
        var incompleteTasks = allTodayTasks
            .Where(t => t.Status != TaskCompletionStatus.Completed)
            .ToList();

        if (totalCount == 0)
        {
            await botClient.SendMessage(user.TelegramId,
                "🌙 Добрый вечер!\n\nСегодня задач не было. Отдыхайте!",
                cancellationToken: ct);
            return;
        }

        if (incompleteTasks.Count == 0)
        {
            await botClient.SendMessage(user.TelegramId,
                $"🌙 Добрый вечер!\n\n"
                + $"Сегодня у вас было {FormatTaskCount(totalCount)}, и вы выполнили все! 🎉\n\n"
                + "Вы выполнили все задачи на сегодня, пора отдохнуть 😊",
                cancellationToken: ct);
            return;
        }

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("🌙 Добрый вечер!");
        sb.AppendLine();
        sb.AppendLine($"Сегодня у вас было {FormatTaskCount(totalCount)}, из них вы выполнили {completedCount}.");
        sb.AppendLine();
        sb.AppendLine($"Не были выполнены ({incompleteTasks.Count}):");

        foreach (var task in incompleteTasks)
        {
            var localStart = TimeZoneInfo.ConvertTimeFromUtc(task.StartAt!.Value, tz);
            var timeLabel = task.IsAllDay ? "весь день" : localStart.ToString("HH:mm");
            sb.AppendLine($"  • {task.Title} — {timeLabel}");
        }

        sb.AppendLine();
        sb.Append("Перенести невыполненные задачи на завтра?");

        var taskIds = string.Join(",", incompleteTasks.Select(t => t.Id));
        var keyboard = new Telegram.Bot.Types.ReplyMarkups.InlineKeyboardMarkup(new[]
        {
            new[]
            {
                Telegram.Bot.Types.ReplyMarkups.InlineKeyboardButton.WithCallbackData(
                    "📅 Перенести", $"digest_reschedule:{taskIds}"),
                Telegram.Bot.Types.ReplyMarkups.InlineKeyboardButton.WithCallbackData(
                    "✋ Оставить", $"digest_keep:{taskIds}")
            }
        });

        await botClient.SendMessage(user.TelegramId, sb.ToString(), replyMarkup: keyboard, cancellationToken: ct);
    }

    private static string FormatTaskCount(int count) => count switch
    {
        1 => "1 задача",
        >= 2 and <= 4 => $"{count} задачи",
        _ => $"{count} задач"
    };

    private static TimeZoneInfo? FindTimeZone(string? ianaId)
    {
        if (string.IsNullOrWhiteSpace(ianaId)) return null;
        try { return TimeZoneInfo.FindSystemTimeZoneById(ianaId); }
        catch (TimeZoneNotFoundException) { return null; }
    }
}

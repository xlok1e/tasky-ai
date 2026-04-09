using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Telegram.Bot;
using Telegram.Bot.Types.ReplyMarkups;
using Tasky.Domain.Enums;
using Tasky.Infrastructure.Persistence;

namespace Tasky.Infrastructure.Services;

public class NotificationSchedulerService(
    IServiceScopeFactory scopeFactory,
    ITelegramBotClient botClient,
    ILogger<NotificationSchedulerService> logger) : BackgroundService
{
    private static readonly TimeSpan PollingInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Notification scheduler started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingNotificationsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Error processing notifications");
            }

            await Task.Delay(PollingInterval, stoppingToken);
        }
    }

    private async Task ProcessPendingNotificationsAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;

        var dueNotifications = await db.NotificationsQueue
            .Include(n => n.User)
                .ThenInclude(u => u.Settings)
            .Include(n => n.Task)
                .ThenInclude(t => t!.List)
            .Where(n => !n.IsSent
                && n.Type == NotificationType.TaskReminder
                && n.ScheduledAt <= now
                && n.TaskId != null)
            .ToListAsync(ct);

        foreach (var notification in dueNotifications)
        {
            if (notification.Task is null || notification.User.TelegramId == 0)
            {
                notification.IsSent = true;
                notification.SentAt = now;
                continue;
            }

            try
            {
                var task = notification.Task;
                var userTimeZone = notification.User.Settings?.TimeZone;
                var message = FormatNotificationMessage(task, userTimeZone);
                var keyboard = new InlineKeyboardMarkup(new[]
                {
                    new[]
                    {
                        InlineKeyboardButton.WithCallbackData("✅ Выполнена", $"task_done:{task.Id}"),
                        InlineKeyboardButton.WithCallbackData("⏸ Отложить", $"task_snooze:{task.Id}")
                    }
                });

                await botClient.SendMessage(
                    notification.User.TelegramId,
                    message,
                    replyMarkup: keyboard,
                    cancellationToken: ct);

                notification.IsSent = true;
                notification.SentAt = DateTime.UtcNow;

                logger.LogInformation(
                    "Sent task reminder for task {TaskId} to user {UserId}",
                    task.Id, notification.UserId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Failed to send notification {NotificationId} for task {TaskId}",
                    notification.Id, notification.TaskId);
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private static string FormatNotificationMessage(Domain.Entities.TaskItem task, string? ianaTimeZone)
    {
        var priorityLabel = task.Priority switch
        {
            TaskPriority.Low => "🟢 Низкий",
            TaskPriority.Medium => "🟡 Средний",
            TaskPriority.High => "🔴 Высокий",
            _ => "—"
        };

        var listName = task.List?.Name ?? "Входящие";

        var effectiveDate = task.StartAt ?? task.EndAt ?? task.Deadline;
        var dateLabel = "Без даты";
        if (effectiveDate.HasValue)
        {
            var localDate = ConvertToUserTime(effectiveDate.Value, ianaTimeZone);
            dateLabel = localDate.ToString("dd.MM.yyyy HH:mm");
        }

        var lines = new List<string>
        {
            "🔔 Напоминание о задаче",
            "",
            $"Задача: {task.Title}",
            $"Список: {listName}",
            $"Время: {dateLabel}",
            $"Приоритет: {priorityLabel}"
        };

        if (!string.IsNullOrWhiteSpace(task.Description))
        {
            var description = task.Description.Length > 200
                ? task.Description[..200] + "..."
                : task.Description;
            lines.Add($"Описание: {description}");
        }

        return string.Join("\n", lines);
    }

    private static DateTime ConvertToUserTime(DateTime utcDateTime, string? ianaTimeZone)
    {
        if (string.IsNullOrWhiteSpace(ianaTimeZone))
            return utcDateTime;

        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(ianaTimeZone);
            return TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc), tz);
        }
        catch (TimeZoneNotFoundException)
        {
            return utcDateTime;
        }
    }
}

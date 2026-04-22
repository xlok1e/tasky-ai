using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Domain.Entities;
using Tasky.Domain.Enums;
using Tasky.Infrastructure.Persistence;

namespace Tasky.Infrastructure.Services;

internal sealed record PendingOperation(string Type, AiChatResponse Response);

public class TelegramBotService(
    ITelegramBotClient botClient,
    IServiceScopeFactory scopeFactory,
    ILogger<TelegramBotService> logger) : BackgroundService
{
    private readonly ConcurrentDictionary<long, PendingOperation> _pendingOperations = new();
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var receiverOptions = new ReceiverOptions
        {
            AllowedUpdates = [UpdateType.Message, UpdateType.CallbackQuery]
        };

        botClient.StartReceiving(
            HandleUpdateAsync,
            HandleErrorAsync,
            receiverOptions,
            stoppingToken
        );

        logger.LogInformation("Telegram bot started");
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task HandleUpdateAsync(ITelegramBotClient bot, Update update, CancellationToken ct)
{
    try
    {
        if (update.CallbackQuery is { } callbackQuery)
        {
            await HandleCallbackQueryAsync(bot, callbackQuery, ct);
            return;
        }

        if (update.Message is not { } message) return;

        var chatId = message.Chat.Id;

        // /start TOKEN
        if (message.Text is { } text && text.StartsWith("/start "))
        {
            var token = text.Substring(7).Trim(); // "/start " = 7 символов
            await ProcessStartCommand(bot, chatId, token, ct, message);
            return;
        }

        // /start без токена
        if (message.Text == "/start")
        {
            await bot.SendMessage(
                chatId,
                "👋 Привет! Я TaskyAI — твой помощник по задачам.\n\n" +
                "Используй кнопки ниже для управления задачами. " +
                "Чтобы авторизоваться в веб-приложении, нажмите кнопку «Подключить Telegram» на сайте.",
                replyMarkup: CreateMainKeyboard(),
                cancellationToken: ct);
            return;
        }

        // Голосовые сообщения
        if (message.Voice is { } voice)
        {
            await ProcessVoiceMessage(bot, chatId, voice, ct);
            return;
        }

        // Текстовые сообщения (команды, AI)
        if (message.Text is { } userMessage && !string.IsNullOrWhiteSpace(userMessage))
        {
            var user = await FindUserByChatIdAsync(chatId, ct);
            if (user is null)
            {
                await bot.SendMessage(chatId,
                    "❌ Вы не авторизованы. Пожалуйста, авторизуйтесь через приложение (нажмите кнопку 'Подключить Telegram').",
                    cancellationToken: ct);
                return;
            }

            if (userMessage == "/help" || userMessage == "❓ Помощь")
            {
                await SendHelpMessage(bot, chatId, ct);
                return;
            }

            if (userMessage == "📝 Мои задачи" || userMessage == "/tasks")
            {
                await SendTasksMessage(bot, chatId, user, ct);
                return;
            }

            if (userMessage == "📊 Статистика" || userMessage == "/stats")
            {
                await SendStatisticsMessage(bot, chatId, user, ct);
                return;
            }

            await ProcessAiMessage(bot, chatId, userMessage, user, ct);
            return;
        }

        // Неизвестный формат
        await bot.SendMessage(
            chatId,
            "Я не понимаю такой формат. Используйте текстовые сообщения или кнопки.",
            replyMarkup: CreateMainKeyboard(),
            cancellationToken: ct);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Unhandled exception in HandleUpdateAsync");
        if (update.Message?.Chat.Id is long chatId)
        {
            await bot.SendMessage(chatId, "❌ Произошла внутренняя ошибка. Попробуйте позже.", cancellationToken: ct);
        }
    }
}

    private async Task ProcessStartCommand(ITelegramBotClient bot, long chatId, string token, CancellationToken ct, Message message)
{
    using var scope = scopeFactory.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var auth = await db.TelegramAuthTokens
        .Include(t => t.User)
        .FirstOrDefaultAsync(t => t.Token == token, ct);

    if (auth is null || auth.ExpiresAt < DateTime.UtcNow)
    {
        await bot.SendMessage(chatId,
            "❌ Недействительный или просроченный токен. Сгенерируйте новую ссылку в приложении.",
            cancellationToken: ct);
        return;
    }

    if (auth.IsUsed)
    {
        await bot.SendMessage(chatId,
            $"✅ Вы уже авторизованы! Ваш аккаунт: {auth.User?.Username ?? "Неизвестно"}",
            cancellationToken: ct);
        return;
    }

    // Определяем пользователя
        Domain.Entities.User user;
    bool isNewUser = false;

    if (auth.User is not null)
    {
        user = auth.User;
        user.TelegramId = chatId;
        user.Username = message.From?.Username ?? user.Username;
    }
    else
    {
        var existingUser = await db.Users.FirstOrDefaultAsync(u => u.TelegramId == chatId, ct);
        if (existingUser is not null)
        {
            user = existingUser;
            user.Username = message.From?.Username ?? user.Username;
        }
        else
        {
            user = new Domain.Entities.User
            {
                TelegramId = chatId,
                Username = message.From?.Username ?? string.Empty
            };
            db.Users.Add(user);
            isNewUser = true;
        }
    }

    await db.SaveChangesAsync(ct);

    auth.IsUsed = true;
    auth.User = user;
    auth.UserId = user.Id;

    await db.SaveChangesAsync(ct);

    var existingSettings = await db.UserSettings
        .FirstOrDefaultAsync(s => s.UserId == user.Id, ct);
    if (existingSettings is null)
    {
        var userSettings = new Domain.Entities.UserSettings
        {
            UserId = user.Id,
            WorkDayStart = new TimeOnly(9, 0),
            WorkDayEnd = new TimeOnly(19, 0),
            TimeZone = "Europe/Moscow",
            MorningNotificationsEnabled = true,
            MorningNotificationTime = new TimeOnly(9, 0),
            EveningNotificationsEnabled = true,
            EveningNotificationTime = new TimeOnly(19, 0),
            UseBuiltinCalendar = true
        };
        db.UserSettings.Add(userSettings);
        await db.SaveChangesAsync(ct);
    }

    await bot.SendMessage(chatId,
        $"🎉 Авторизация успешна, {user.Username}!\n\nТеперь вы можете вернуться в веб-приложение и продолжить работу.",
        cancellationToken: ct);

    await SendHelpMessage(bot, chatId, ct);
}

    private async Task SendHelpMessage(ITelegramBotClient bot, long chatId, CancellationToken ct)
    {
        var helpText =
            "🤖 *Я — TaskyAI, твой умный ассистент\\.*\n\n" +
            "Я помогаю управлять делами, понимая обычный язык\\. Тебе не нужно заполнять формы — просто пиши или говори\\.\n\n" +
            "🎙 *Голосовое планирование:*\n" +
            "Зажми микрофон и скажи: _«Запиши встречу с клиентом завтра в 11 утра»_\\. Я сам создам задачу\\.\n\n" +
            "💡 *Что я умею:*\n" +
            "• Создавать задачи из текста и голоса\n" +
            "• Показывать статистику по задачам\n" +
            "• Присылать утренние сводки планов\n" +
            "• Напоминать о дедлайнах\n\n" +
            "⚙️ *Твой рабочий день:*\n" +
            "Я учитываю твои настройки рабочего времени при планировании задач\\.";

        await bot.SendMessage(
            chatId: chatId,
            text: helpText,
            parseMode: ParseMode.MarkdownV2,
            replyMarkup: CreateMainKeyboard(),
            cancellationToken: ct
        );
    }

    private async Task ProcessVoiceMessage(ITelegramBotClient bot, long chatId, Voice voice, CancellationToken ct)
    {
        var user = await FindUserByChatIdAsync(chatId, ct);
        if (user is null)
        {
            await bot.SendMessage(chatId,
                "❌ Вы не авторизованы. Пожалуйста, авторизуйтесь через приложение.",
                cancellationToken: ct);
            return;
        }

        try
        {
            await bot.SendChatAction(chatId, ChatAction.Typing, cancellationToken: ct);

            using var audioStream = new MemoryStream();

            try
            {
                var file = await botClient.GetFile(voice.FileId, ct);
                if (string.IsNullOrEmpty(file.FilePath))
                    throw new InvalidOperationException("Telegram did not return a file path");

                await botClient.DownloadFile(file.FilePath, audioStream, ct);
                audioStream.Position = 0;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error downloading voice file from Telegram for user {UserId}", user.Id);
                await bot.SendMessage(chatId,
                    "❌ Ошибка при скачивании файла. Пожалуйста, попробуйте снова.",
                    cancellationToken: ct);
                return;
            }

            using var transcribeScope = scopeFactory.CreateScope();
            var transcribeAiService = transcribeScope.ServiceProvider.GetRequiredService<IAiAssistantService>();
            var transcribedText = await transcribeAiService.TranscribeAudioAsync(audioStream, $"voice_{voice.FileId}.ogg");

            if (string.IsNullOrWhiteSpace(transcribedText))
            {
                await bot.SendMessage(chatId,
                    "❌ Не удалось расшифровать голосовое сообщение. Пожалуйста, попробуйте снова или отправьте текстовое сообщение.",
                    cancellationToken: ct);
                logger.LogWarning("Failed to transcribe voice message for user {UserId}", user.Id);
                return;
            }

            await ProcessAiMessage(bot, chatId, transcribedText, user, ct);

            logger.LogInformation("Voice message transcribed successfully for user {UserId}", user.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing voice message for user {UserId}: {ErrorMessage}", user.Id, ex.Message);
            await bot.SendMessage(chatId,
                "❌ Ошибка при обработке голосового сообщения. Пожалуйста, попробуйте снова позже.",
                cancellationToken: ct);
        }
    }

    private async Task ProcessAiMessage(ITelegramBotClient bot, long chatId, string userMessage, Tasky.Domain.Entities.User user, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var aiService = scope.ServiceProvider.GetRequiredService<IAiAssistantService>();

        try
        {
            await bot.SendChatAction(chatId, ChatAction.Typing, cancellationToken: ct);

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(30));

            var chatTask = aiService.ChatAsync(user.Id, userMessage);
            if (await Task.WhenAny(chatTask, Task.Delay(Timeout.Infinite, timeoutCts.Token)) != chatTask)
                throw new OperationCanceledException("AI request timed out");

            var response = await chatTask;

            if (response.PendingTask is not null || response.PendingUpdate is not null || response.PendingDelete is not null)
            {
                var operationType = response.PendingTask is not null ? "task"
                    : response.PendingUpdate is not null ? "update"
                    : "delete";

                _pendingOperations[chatId] = new PendingOperation(operationType, response);

                var keyboard = new InlineKeyboardMarkup(new[]
                {
                    new[]
                    {
                        InlineKeyboardButton.WithCallbackData("✅ Подтвердить", "confirm"),
                        InlineKeyboardButton.WithCallbackData("❌ Отмена", "cancel")
                    }
                });

                await bot.SendMessage(chatId, response.Reply, replyMarkup: keyboard, cancellationToken: ct);
            }
            else
            {
                await bot.SendMessage(chatId, response.Reply, cancellationToken: ct);
            }

            logger.LogInformation("AI message processed successfully for user {UserId}", user.Id);
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning("AI assistant request timeout for user {UserId}", user.Id);
            await bot.SendMessage(chatId,
                "⏱️ Время ожидания истекло. Пожалуйста, попробуйте снова.",
                cancellationToken: ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing AI message for user {UserId}: {ErrorMessage}", user.Id, ex.Message);
            await bot.SendMessage(chatId,
                "❌ Ошибка при обработке сообщения. Пожалуйста, попробуйте снова позже.",
                cancellationToken: ct);
        }
    }

    private async Task HandleCallbackQueryAsync(ITelegramBotClient bot, CallbackQuery callbackQuery, CancellationToken ct)
    {
        var data = callbackQuery.Data ?? string.Empty;
        var chatId = callbackQuery.Message!.Chat.Id;
        var messageId = callbackQuery.Message.MessageId;
        var originalText = callbackQuery.Message.Text ?? string.Empty;

        await bot.AnswerCallbackQuery(callbackQuery.Id, cancellationToken: ct);

        if (data.StartsWith("task_done:") || data.StartsWith("task_snooze:"))
        {
            await HandleTaskNotificationCallbackAsync(bot, chatId, messageId, originalText, data, ct);
            return;
        }

        if (data.StartsWith("digest_reschedule:") || data.StartsWith("digest_keep:"))
        {
            await HandleDigestRescheduleCallbackAsync(bot, chatId, messageId, originalText, data, ct);
            return;
        }

        if (data == "cancel")
        {
            _pendingOperations.TryRemove(chatId, out _);
            await bot.EditMessageText(chatId, messageId,
                $"❌ Операция отменена\n\n{originalText}",
                cancellationToken: ct);
            return;
        }

        if (data != "confirm") return;

        if (!_pendingOperations.TryRemove(chatId, out var pending))
        {
            await bot.EditMessageText(chatId, messageId,
                $"⚠️ Операция устарела. Пожалуйста, повторите запрос.\n\n{originalText}",
                cancellationToken: ct);
            return;
        }

        var user = await FindUserByChatIdAsync(chatId, ct);
        if (user is null)
        {
            await bot.EditMessageText(chatId, messageId,
                $"❌ Вы не авторизованы.\n\n{originalText}",
                cancellationToken: ct);
            return;
        }

        using var scope = scopeFactory.CreateScope();
        var aiService = scope.ServiceProvider.GetRequiredService<IAiAssistantService>();

        await bot.SendChatAction(chatId, ChatAction.Typing, cancellationToken: ct);

        try
        {
            string resultText;

            if (pending.Type == "task" && pending.Response.PendingTask is not null)
            {
                await aiService.ConfirmTaskAsync(user.Id, pending.Response.PendingTask);
                resultText = $"✅ Вы подтвердили действие\n\n{originalText}";
                await aiService.SaveConfirmationToHistoryAsync(user.Id, "Да, подтверждаю", "Задача успешно создана.");
            }
            else if (pending.Type == "update" && pending.Response.PendingUpdate is not null)
            {
                await aiService.ConfirmUpdateAsync(user.Id, pending.Response.PendingUpdate);
                resultText = $"✅ Вы подтвердили действие\n\n{originalText}";
                await aiService.SaveConfirmationToHistoryAsync(user.Id, "Да, подтверждаю", "Задача успешно обновлена.");
            }
            else if (pending.Type == "delete" && pending.Response.PendingDelete is not null)
            {
                var deleted = await aiService.ConfirmDeleteAsync(user.Id, pending.Response.PendingDelete.TaskId);
                resultText = deleted
                    ? $"✅ Вы подтвердили действие\n\n{originalText}"
                    : $"❌ Задача не найдена\n\n{originalText}";
                if (deleted)
                    await aiService.SaveConfirmationToHistoryAsync(user.Id, "Да, подтверждаю", "Задача успешно удалена.");
            }
            else
            {
                resultText = $"⚠️ Неизвестная операция\n\n{originalText}";
            }

            await bot.EditMessageText(chatId, messageId, resultText, cancellationToken: ct);

            logger.LogInformation("Confirmed {Type} operation for user {UserId}", pending.Type, user.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error confirming {Type} for user {UserId}", pending.Type, user.Id);
            await bot.EditMessageText(chatId, messageId,
                $"❌ Ошибка при выполнении операции\n\n{originalText}",
                cancellationToken: ct);
        }
    }

    private async Task HandleTaskNotificationCallbackAsync(
        ITelegramBotClient bot, long chatId, int messageId,
        string originalText, string data, CancellationToken ct)
    {
        var parts = data.Split(':');
        if (parts.Length != 2 || !int.TryParse(parts[1], out var taskId))
        {
            await bot.EditMessageText(chatId, messageId, originalText, cancellationToken: ct);
            return;
        }

        var action = parts[0];
        var user = await FindUserByChatIdAsync(chatId, ct);
        if (user is null) return;

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (action == "task_done")
        {
            var task = await db.Tasks
                .FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == user.Id, ct);

            if (task is not null)
            {
                task.Status = TaskCompletionStatus.Completed;
                task.CompletedAt = DateTime.UtcNow;
                task.NotifyAt = null;
                await db.SaveChangesAsync(ct);
            }

            await bot.EditMessageText(chatId, messageId,
                $"✅ Задача выполнена!\n\n{originalText}",
                cancellationToken: ct);

            logger.LogInformation("Task {TaskId} marked as completed via Telegram by user {UserId}", taskId, user.Id);
        }
        else if (action == "task_snooze")
        {
            // Remove the notification, task stays as is
            var notification = await db.NotificationsQueue
                .FirstOrDefaultAsync(n => n.TaskId == taskId && n.UserId == user.Id && n.IsSent, ct);

            if (notification is not null)
            {
                var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == user.Id, ct);
                if (task is not null)
                {
                    task.NotifyAt = null;
                }
            }
            await db.SaveChangesAsync(ct);

            await bot.EditMessageText(chatId, messageId,
                $"⏸ Уведомление отложено\n\n{originalText}",
                cancellationToken: ct);

            logger.LogInformation("Task {TaskId} notification snoozed by user {UserId}", taskId, user.Id);
        }
    }

    private async Task HandleDigestRescheduleCallbackAsync(
        ITelegramBotClient bot, long chatId, int messageId,
        string originalText, string data, CancellationToken ct)
    {
        var colonIndex = data.IndexOf(':');
        if (colonIndex < 0)
        {
            await bot.EditMessageText(chatId, messageId, originalText, cancellationToken: ct);
            return;
        }

        var action = data[..colonIndex];
        var idsString = data[(colonIndex + 1)..];
        var taskIds = idsString.Split(',')
            .Select(s => int.TryParse(s, out var id) ? id : 0)
            .Where(id => id > 0)
            .ToList();

        if (taskIds.Count == 0)
        {
            await bot.EditMessageText(chatId, messageId, originalText, cancellationToken: ct);
            return;
        }

        var user = await FindUserByChatIdAsync(chatId, ct);
        if (user is null) return;

        if (action == "digest_keep")
        {
            await bot.EditMessageText(chatId, messageId,
                $"✋ Задачи оставлены без изменений\n\n{originalText}",
                cancellationToken: ct);
            return;
        }

        // digest_reschedule — move tasks to tomorrow at the same time
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var tasks = await db.Tasks
            .Where(t => taskIds.Contains(t.Id) && t.UserId == user.Id)
            .ToListAsync(ct);

        var rescheduledCount = 0;
        foreach (var task in tasks)
        {
            if (task.StartAt.HasValue)
            {
                task.StartAt = task.StartAt.Value.AddDays(1);
                if (task.EndAt.HasValue)
                    task.EndAt = task.EndAt.Value.AddDays(1);
                if (task.NotifyAt.HasValue)
                    task.NotifyAt = task.NotifyAt.Value.AddDays(1);
                rescheduledCount++;
            }
        }

        // Also move notification queue entries
        var notificationEntries = await db.NotificationsQueue
            .Where(n => taskIds.Contains(n.TaskId!.Value)
                && n.UserId == user.Id
                && !n.IsSent
                && n.Type == NotificationType.TaskReminder)
            .ToListAsync(ct);

        foreach (var n in notificationEntries)
            n.ScheduledAt = n.ScheduledAt.AddDays(1);

        await db.SaveChangesAsync(ct);

        // Sync with Google Calendar if connected
        var googleState = await db.GoogleSyncStates.FirstOrDefaultAsync(g => g.UserId == user.Id, ct);
        if (googleState is not null)
        {
            var googleCalendar = scope.ServiceProvider.GetRequiredService<IGoogleCalendarService>();
            try
            {
                await googleCalendar.RefreshTokenIfNeededAsync(googleState);
                foreach (var task in tasks.Where(t => !string.IsNullOrEmpty(t.GoogleEventId)))
                {
                    try { await googleCalendar.UpdateEventAsync(googleState, task.GoogleEventId!, task); }
                    catch { /* non-critical */ }
                }
            }
            catch { /* non-critical */ }
        }

        await bot.EditMessageText(chatId, messageId,
            $"📅 Перенесено задач на завтра: {rescheduledCount}\n\n{originalText}",
            cancellationToken: ct);

        logger.LogInformation("Rescheduled {Count} tasks to tomorrow for user {UserId}", rescheduledCount, user.Id);
    }

    private async Task<Tasky.Domain.Entities.User?> FindUserByChatIdAsync(long chatId, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users
            .Include(u => u.Settings)
            .FirstOrDefaultAsync(u => u.TelegramId == chatId, ct);
    }

    private static DateTime ConvertToUserTime(DateTime utcDateTime, string? ianaTimeZone)
    {
        if (string.IsNullOrWhiteSpace(ianaTimeZone))
            return utcDateTime;

        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(ianaTimeZone);
            return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime, tz);
        }
        catch (TimeZoneNotFoundException)
        {
            return utcDateTime;
        }
    }

    private static string FormatUserFriendlyDate(DateTime localDateTime, DateTime nowLocal)
    {
        var dayDiff = (localDateTime.Date - nowLocal.Date).Days;
        var time = localDateTime.ToString("HH:mm");

        var dayLabel = dayDiff switch
        {
            0 => "Сегодня",
            1 => "Завтра",
            2 => "Послезавтра",
            _ => localDateTime.ToString("d MMMM", new System.Globalization.CultureInfo("ru-RU"))
        };

        return $"{dayLabel} {time}";
    }

    private async Task SendTasksMessage(ITelegramBotClient bot, long chatId, Tasky.Domain.Entities.User user, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var taskService = scope.ServiceProvider.GetRequiredService<ITaskService>();

        var tasks = await taskService.GetAllAsync(user.Id, 0, false, null, null, null, null, null, null, null);

        var userTimeZone = user.Settings?.TimeZone;
        var nowUtc = DateTime.UtcNow;
        var nowLocal = ConvertToUserTime(nowUtc, userTimeZone);
        var weekAheadLocal = nowLocal.Date.AddDays(7);

        var upcomingTasks = tasks
            .Where(t => t.Status != TaskCompletionStatus.Completed)
            .Select(t =>
            {
                var effectiveDateUtc = t.StartAt ?? t.Deadline ?? t.EndAt;
                var effectiveDateLocal = effectiveDateUtc.HasValue
                    ? ConvertToUserTime(effectiveDateUtc.Value, userTimeZone)
                    : (DateTime?)null;
                return new { Task = t, EffectiveDate = effectiveDateLocal };
            })
            .Where(x => x.EffectiveDate.HasValue && x.EffectiveDate.Value >= nowLocal && x.EffectiveDate.Value.Date <= weekAheadLocal)
            .OrderBy(x => x.EffectiveDate)
            .ToList();

        if (!upcomingTasks.Any())
        {
            await bot.SendMessage(chatId, "📝 Нет задач на ближайшие 7 дней.", replyMarkup: CreateMainKeyboard(), cancellationToken: ct);
            return;
        }

        var taskList = string.Join("\n", upcomingTasks.Select(x =>
        {
            var date = FormatUserFriendlyDate(x.EffectiveDate!.Value, nowLocal);
            return $"- {x.Task.Title} ({date})";
        }));
        var message = $"📝 Задачи на ближайшие 7 дней:\n{taskList}";

        await bot.SendMessage(chatId, message, replyMarkup: CreateMainKeyboard(), cancellationToken: ct);
    }

    private async Task SendStatisticsMessage(ITelegramBotClient bot, long chatId, Tasky.Domain.Entities.User user, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var analyticsService = scope.ServiceProvider.GetRequiredService<IAnalyticsService>();

        var localNow = DateTime.UtcNow.AddHours(3);
        var startDateUtc = DateTime.SpecifyKind(localNow.Date.AddDays(-6).AddHours(-3), DateTimeKind.Utc);
        var endDateUtc = DateTime.SpecifyKind(localNow.Date.AddHours(23).AddMinutes(59).AddSeconds(59).AddHours(-3), DateTimeKind.Utc);

        var request = new Tasky.Application.DTOs.Requests.TaskAnalyticsRequest
        {
            StartDate = startDateUtc,
            EndDate = endDateUtc
        };

        var analytics = await analyticsService.GetAnalyticsAsync(user.Id, request);

        if (analytics.TotalTasks == 0 && analytics.CompletedTasks == 0)
        {
            await bot.SendMessage(chatId, "📊 За последнюю неделю задач не найдено.", replyMarkup: CreateMainKeyboard(), cancellationToken: ct);
            return;
        }

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("📊 Статистика за неделю:");
        sb.AppendLine();
        sb.AppendLine($"📋 Всего задач: {analytics.TotalTasks}");
        sb.AppendLine($"✅ Выполнено: {analytics.CompletedTasks}");

        if (analytics.TotalTasks > 0 && analytics.CompletedTasks > 0)
        {
            var rate = (int)Math.Round((double)analytics.CompletedTasks / analytics.TotalTasks * 100);
            sb.AppendLine($"📈 Процент выполнения: {rate}%");
        }

        if (analytics.TotalHoursSpent > 0)
        {
            sb.AppendLine($"⏱ Затрачено: {FormatHours(analytics.TotalHoursSpent)}");
            sb.AppendLine($"⏳ Среднее на задачу: {FormatHours(analytics.AveragePerTask)}");
        }

        if (analytics.MostProductivePeriod != "Нет данных")
            sb.AppendLine($"🏆 Продуктивный период: {analytics.MostProductivePeriod}");

        if (analytics.PieChartData.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("📂 По спискам:");
            foreach (var pie in analytics.PieChartData.OrderByDescending(p => p.TaskCount).Take(5))
                sb.AppendLine($"  • {pie.ListName}: {pie.TaskCount} (выполнено: {pie.CompletedCount})");
        }

        await bot.SendMessage(chatId, sb.ToString().Trim(), replyMarkup: CreateMainKeyboard(), cancellationToken: ct);
    }

    private static string FormatHours(double hours)
    {
        if (hours < 1)
            return $"{(int)Math.Round(hours * 60)} мин.";
        var h = (int)hours;
        var m = (int)Math.Round((hours - h) * 60);
        return m > 0 ? $"{h} ч. {m} мин." : $"{h} ч.";
    }

    private static ReplyKeyboardMarkup CreateMainKeyboard() =>
        new(new[]
        {
            new[] { new KeyboardButton("📝 Мои задачи"), new KeyboardButton("📊 Статистика") },
            new[] { new KeyboardButton("❓ Помощь") }
        })
        {
            ResizeKeyboard = true,
            IsPersistent = true
        };

    private async Task HandleErrorAsync(ITelegramBotClient bot, Exception exception, CancellationToken ct)
    {
        if (exception is Telegram.Bot.Exceptions.RequestException { InnerException: HttpRequestException })
        {
            logger.LogWarning("Telegram connection dropped, retrying in 5s...");
            await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }
        else
        {
            logger.LogError(exception, "Telegram bot error");
        }
    }
}

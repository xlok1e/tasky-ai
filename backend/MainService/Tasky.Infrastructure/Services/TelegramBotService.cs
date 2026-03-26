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
        if (update.CallbackQuery is { } callbackQuery)
        {
            await HandleCallbackQueryAsync(bot, callbackQuery, ct);
            return;
        }

        if (update.Message is not { } message) return;

        var chatId = message.Chat.Id;

        // Обработка команды /start TOKEN
        if (message.Text is { } text && text.StartsWith("/start "))
        {
            var token = text.Substring(6).Trim();
            await ProcessStartCommand(bot, chatId, token, ct, message);
            return;
        }

        // Обработка контакта (номер телефона)
        if (message.Contact is { } contact)
        {
            await ProcessPhoneNumber(bot, chatId, contact.PhoneNumber!, ct, message);
            return;
        }

        // Обработка голосовых сообщений
        if (message.Voice is { } voice)
        {
            await ProcessVoiceMessage(bot, chatId, voice, ct);
            return;
        }

        // Обработка текстовых сообщений (ИИ-ассистент)
        if (message.Text is { } userMessage && !string.IsNullOrWhiteSpace(userMessage))
        {
            await ProcessAiMessage(bot, chatId, userMessage, ct);
            return;
        }

        // Неизвестная команда
        await SendKeyboardMessage(bot, chatId, "👋 Привет! Нажми кнопку ниже, чтобы поделиться номером телефона:", ct);
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
                "Недействительный или просроченный токен. Сгенерируйте новую ссылку в приложении.",
                cancellationToken: ct);
            return;
        }

        if (auth.IsUsed)
        {
            await bot.SendMessage(chatId,
                $"Вы уже авторизованы! Ваш аккаунт: {auth.User?.Username ?? "Неизвестно"}",
                cancellationToken: ct);
            return;
        }

        await bot.SendMessage(chatId,
            "Подтвердите свою личность, поделившись номером телефона:",
            cancellationToken: ct);

        await SendKeyboardMessage(bot, chatId, "📱 Поделиться номером телефона:", ct);
    }

    private async Task ProcessPhoneNumber(ITelegramBotClient bot, long chatId, string phoneNumber, CancellationToken ct, Message message)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Ищем последний неиспользованный токен
        var auth = await db.TelegramAuthTokens
            .Include(t => t.User)
            .Where(t => !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(t => t.Id)
            .FirstOrDefaultAsync(ct);

        if (auth is null)
        {
            await bot.SendMessage(chatId,
                "Нет активных токенов авторизации. Сгенерируйте новую ссылку в приложении.",
                cancellationToken: ct);
            return;
        }

        // Find existing user by TelegramId first to avoid duplicate key violation
        var existingUser = await db.Users.FirstOrDefaultAsync(u => u.TelegramId == chatId, ct);

        Domain.Entities.User user;
        if (existingUser is not null)
        {
            user = existingUser;
            user.PhoneNumber = phoneNumber;
            user.Username = message.From?.Username ?? user.Username;
        }
        else if (auth.User is not null)
        {
            user = auth.User;
            user.TelegramId = chatId;
            user.PhoneNumber = phoneNumber;
            user.Username = message.From?.Username ?? user.Username;
        }
        else
        {
            user = new Domain.Entities.User
            {
                TelegramId = chatId,
                PhoneNumber = phoneNumber,
                Username = message.From?.Username ?? string.Empty
            };
            db.Users.Add(user);
        }
        auth.User = user;

        auth.PhoneNumber = phoneNumber;
        auth.IsUsed = true;
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
            $"Авторизация успешна, {user.Username}!\n\nТеперь вы можете использовать TaskyAI через Telegram.",
            replyMarkup: new ReplyKeyboardRemove(),
            cancellationToken: ct);
    }

    private async Task ProcessVoiceMessage(ITelegramBotClient bot, long chatId, Voice voice, CancellationToken ct)
    {
        var user = await FindUserByChatIdAsync(chatId, ct);
        if (user is null)
        {
            await bot.SendMessage(chatId,
                "Вы не авторизованы. Пожалуйста, авторизуйтесь через приложение.",
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
                    "Ошибка при скачивании файла. Пожалуйста, попробуйте снова.",
                    cancellationToken: ct);
                return;
            }

            using var transcribeScope = scopeFactory.CreateScope();
            var transcribeAiService = transcribeScope.ServiceProvider.GetRequiredService<IAiAssistantService>();
            var transcribedText = await transcribeAiService.TranscribeAudioAsync(audioStream, $"voice_{voice.FileId}.ogg");

            if (string.IsNullOrWhiteSpace(transcribedText))
            {
                await bot.SendMessage(chatId,
                    "Не удалось расшифровать голосовое сообщение. Пожалуйста, попробуйте снова или отправьте текстовое сообщение.",
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
                "Ошибка при обработке голосового сообщения. Пожалуйста, попробуйте снова позже.",
                cancellationToken: ct);
        }
    }

    private async Task ProcessAiMessage(ITelegramBotClient bot, long chatId, string userMessage, CancellationToken ct)
    {
        var user = await FindUserByChatIdAsync(chatId, ct);
        if (user is null)
        {
            await bot.SendMessage(chatId,
                "Вы не авторизованы. Пожалуйста, авторизуйтесь через приложение.",
                cancellationToken: ct);
            return;
        }

        await ProcessAiMessage(bot, chatId, userMessage, user, ct);
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

    private async Task<Tasky.Domain.Entities.User?> FindUserByChatIdAsync(long chatId, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users.FirstOrDefaultAsync(u => u.TelegramId == chatId, ct);
    }

    private async Task SendKeyboardMessage(ITelegramBotClient bot, long chatId, string text, CancellationToken ct)
    {
        var keyboard = new ReplyKeyboardMarkup(new[]
        {
            new KeyboardButton("📱 Поделиться номером")
            {
                RequestContact = true
            }
        })
        {
            ResizeKeyboard = true,
            OneTimeKeyboard = true
        };

        await bot.SendMessage(chatId, text,
            replyMarkup: keyboard,
            cancellationToken: ct);
    }

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

using System.Net.Http;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;
using Tasky.Application.Interfaces;
using Tasky.Domain.Entities;
using Tasky.Infrastructure.Persistence;

namespace Tasky.Infrastructure.Services;

public class TelegramBotService(
    ITelegramBotClient botClient,
    IServiceScopeFactory scopeFactory,
    ILogger<TelegramBotService> logger,
    IAiAssistantService aiAssistantService,
    IConfiguration configuration) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var receiverOptions = new ReceiverOptions
        {
            AllowedUpdates = [UpdateType.Message]
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

        await bot.SendMessage(chatId,
            "📱 Подтвердите свою личность, поделившись номером телефона:",
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
                "❌ Нет активных токенов авторизации. Сгенерируйте новую ссылку в приложении.",
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
            $"✅ Авторизация успешна, {user.Username}!\n\nТеперь вы можете использовать TaskyAI через Telegram.",
            replyMarkup: new ReplyKeyboardRemove(),
            cancellationToken: ct);
    }

    private async Task ProcessVoiceMessage(ITelegramBotClient bot, long chatId, Voice voice, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var user = await db.Users
            .FirstOrDefaultAsync(u => u.TelegramId == chatId, ct);

        if (user is null)
        {
            await bot.SendMessage(chatId,
                "❌ Вы не авторизованы. Пожалуйста, авторизуйтесь через приложение.",
                cancellationToken: ct);
            return;
        }

        try
        {
            // Отправим сообщение о начале обработки
            await bot.SendMessage(chatId,
                "🎙️ Транскрибирую голосовое сообщение...",
                cancellationToken: ct);

            // Скачиваем файл из Telegram через API
            var botToken = configuration["Telegram:BotToken"];
            if (string.IsNullOrEmpty(botToken))
            {
                logger.LogError("Telegram bot token is not configured");
                await bot.SendMessage(chatId,
                    "❌ Ошибка конфигурации бота. Пожалуйста, попробуйте позже.",
                    cancellationToken: ct);
                return;
            }

            using var audioStream = new MemoryStream();
            
            try
            {
                using var httpClient = new HttpClient();
                var fileUrl = $"https://api.telegram.org/bot{botToken}/getFile?file_id={voice.FileId}";
                using var getFileResponse = await httpClient.GetAsync(fileUrl, ct);
                
                if (!getFileResponse.IsSuccessStatusCode)
                {
                    throw new Exception("Failed to get file info from Telegram");
                }
                
                var getFileContent = await getFileResponse.Content.ReadAsStringAsync();
                using var getFileDoc = JsonDocument.Parse(getFileContent);
                
                if (!getFileDoc.RootElement.TryGetProperty("result", out var resultEl))
                    throw new Exception("Invalid Telegram API response");
                
                if (!resultEl.TryGetProperty("file_path", out var filePathEl))
                    throw new Exception("File path not found in Telegram response");
                
                var filePath = filePathEl.GetString();
                if (string.IsNullOrEmpty(filePath))
                    throw new Exception("Failed to get file path from Telegram");

                // Скачиваем сам файл
                var downloadUrl = $"https://api.telegram.org/file/bot{botToken}/{filePath}";
                using var downloadResponse = await httpClient.GetAsync(downloadUrl, ct);
                
                if (!downloadResponse.IsSuccessStatusCode)
                    throw new Exception("Failed to download audio file from Telegram");

                await downloadResponse.Content.CopyToAsync(audioStream);
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

            // Транскрибируем аудио
            var transcribedText = await aiAssistantService.TranscribeAudioAsync(audioStream, $"voice_{voice.FileId}.ogg");

            // Обработаем результат транскрибации
            if (string.IsNullOrWhiteSpace(transcribedText))
            {
                await bot.SendMessage(chatId,
                    "❌ Не удалось расшифровать голосовое сообщение. Пожалуйста, попробуйте снова или отправьте текстовое сообщение.",
                    cancellationToken: ct);
                logger.LogWarning("Failed to transcribe voice message for user {UserId}", user.Id);
                return;
            }

            // Отправим фидбек пользователю о том, что команда принята
            await bot.SendMessage(chatId,
                $"✅ Расшифровка принята:\n\n_{transcribedText}_",
                parseMode: ParseMode.Markdown,
                cancellationToken: ct);

            // Передадим расшифрованный текст в обработчик AI
            await ProcessAiMessage(bot, chatId, transcribedText, ct);

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

    private async Task ProcessAiMessage(ITelegramBotClient bot, long chatId, string userMessage, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var user = await db.Users
            .FirstOrDefaultAsync(u => u.TelegramId == chatId, ct);

        if (user is null)
        {
            await bot.SendMessage(chatId,
                "❌ Вы не авторизованы. Пожалуйста, авторизуйтесь через приложение.",
                cancellationToken: ct);
            return;
        }

        try
        {

            await bot.SendMessage(chatId,
                "⏳ Обрабатываю ваше сообщение...",
                cancellationToken: ct);


            using (var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct))
            {
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(30));

                var response = await aiAssistantService.ChatAsync(user.Id, userMessage);

                await bot.SendMessage(chatId,
                    response.Reply,
                    cancellationToken: ct);

                logger.LogInformation("AI message processed successfully for user {UserId}", user.Id);
            }
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

using Microsoft.EntityFrameworkCore;
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
    ILogger<TelegramBotService> logger) : BackgroundService
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

    private async Task HandleUpdateAsync(
        ITelegramBotClient bot,
        Update update,
        CancellationToken ct)
    {
        if (update.Message is not { } message) return;

        // /start TOKEN
        if (message.Text is { } text && text.StartsWith("/start"))
        {
            var parts = text.Split(' ');
            var token = parts.Length > 1 ? parts[1] : null;

            if (string.IsNullOrWhiteSpace(token))
            {
                await bot.SendMessage(
                    message.Chat.Id,
                    "Привет! Используй кнопку входа в веб-приложении TaskyAI.",
                    cancellationToken: ct);
                return;
            }
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var auth = await db.TelegramAuthTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Token == token, ct);

            if (auth is null || auth.IsUsed || auth.ExpiresAt < DateTime.UtcNow)
            {
                await bot.SendMessage(
                    message.Chat.Id,
                    "Недействительный или просроченный токен. Пожалуйста, сгенерируйте новый токен в веб-приложении TaskyAI.",
                    cancellationToken: ct);
                return;
            }

            Domain.Entities.User user;
            if (auth.User is null)

            {
                user = new Domain.Entities.User
                {
                    TelegramId = message.Chat.Id,
                    Username = message.From?.Username ?? string.Empty
                };
                db.Users.Add(user);
                auth.User = user;
            }
            else
            {
                user = auth.User;
                user.TelegramId = message.Chat.Id;
                user.Username = message.From?.Username ?? user.Username;
            }
            auth.IsUsed = true;
            auth.UserId = user.Id;

            await db.SaveChangesAsync(ct);

            await bot.SendMessage(
                message.Chat.Id,
                $"Привет, {user.Username}! Ты успешно вошел в TaskyAI через Telegram.",
                cancellationToken: ct);
            return;
        }

        await bot.SendMessage(
            message.Chat.Id,
            "Я понимаю только команду /start TOKEN.",
            cancellationToken: ct);
    }

    private Task HandleErrorAsync(
        ITelegramBotClient bot,
        Exception exception,
        CancellationToken ct)
    {
        logger.LogError(exception, "Telegram bot error");
        return Task.CompletedTask;
    }
}


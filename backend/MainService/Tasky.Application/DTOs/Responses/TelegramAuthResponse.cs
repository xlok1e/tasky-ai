namespace Tasky.Application.DTOs.Responses;

public record TelegramAuthResponse(
    string Token,
    DateTime ExpiresAt,
    bool IsUsed,
    string? Username
);

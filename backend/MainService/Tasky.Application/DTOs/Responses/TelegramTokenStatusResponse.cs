namespace Tasky.Application.DTOs.Responses;

public record TelegramTokenStatusResponse(
    bool IsUsed,
    string? Username
);

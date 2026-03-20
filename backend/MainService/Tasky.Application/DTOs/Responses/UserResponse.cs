namespace Tasky.Application.DTOs.Responses;

public record UserProfileResponse(
    int Id,
    string? TelegramUsername, 
    string? PhoneNumber,
    DateTime CreatedAt
);
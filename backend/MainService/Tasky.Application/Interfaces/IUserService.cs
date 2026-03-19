using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;

namespace Tasky.Application.Interfaces;

public interface IUserService
{
    Task<UserProfileResponse?> GetProfileAsync(int userId);
    Task<UserSettingsResponse?> GetSettingsAsync(int userId);
    Task<UserSettingsResponse?> UpdateSettingsAsync(int userId, UpdateUserSettingsRequest request);
}
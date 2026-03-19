using Tasky.Application.DTOs.Responses;

namespace Tasky.Application.Interfaces;

public interface IUserService
{
    Task<UserProfileResponse?> GetProfileAsync(int userId);
}
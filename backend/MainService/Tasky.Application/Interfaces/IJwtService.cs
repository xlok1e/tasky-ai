namespace Tasky.Application.Interfaces
{
    public interface IJwtService
    {
        string GenerateToken(Tasky.Domain.Entities.User user);
    }
}
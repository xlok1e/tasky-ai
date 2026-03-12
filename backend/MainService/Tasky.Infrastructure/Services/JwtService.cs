using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Tasky.Application.Interfaces;
using Tasky.Domain.Entities;

namespace Tasky.Infrastructure.Services;

public class JwtService(IConfiguration config) : IJwtService
{
    public string GenerateToken(User user)
    {
        var secret = config["Jwt:Secret"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("userId", user.Id.ToString()),
            new Claim("telegramId", user.TelegramId.ToString()),
            new Claim("username", user.Username),
        };

        var expires = DateTime.UtcNow.AddDays(int.Parse(config["Jwt:ExpiresInDays"]!));

        var token = new JwtSecurityToken(
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
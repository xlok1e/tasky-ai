using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;

namespace Tasky.API.Controllers;

[ApiController]
[Authorize(AuthenticationSchemes = "Bearer")]
[Route("api/me")]
public class MeController : ControllerBase
{
    private readonly IUserService _userService;

    public MeController(IUserService userService)
    {
        _userService = userService;
    }

    private int UserId => int.Parse(User.FindFirst("userId")?.Value ?? "0");

    [HttpGet]
    public async Task<ActionResult<UserProfileResponse>> GetMe()
    {
        var profile = await _userService.GetProfileAsync(UserId);
        return profile is not null ? Ok(profile) : NotFound();
    }

    [HttpGet("settings")]
    public async Task<ActionResult<UserSettingsResponse>> GetSettings()
    {
        var settings = await _userService.GetSettingsAsync(UserId);
        return settings is not null ? Ok(settings) : NotFound();
    }

    [HttpPatch("settings")]
    public async Task<ActionResult<UserSettingsResponse>> UpdateSettings([FromBody] UpdateUserSettingsRequest request)
    {
        var settings = await _userService.UpdateSettingsAsync(UserId, request);
        return settings is not null ? Ok(settings) : NotFound();
    }
}

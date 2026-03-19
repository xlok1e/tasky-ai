using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
}

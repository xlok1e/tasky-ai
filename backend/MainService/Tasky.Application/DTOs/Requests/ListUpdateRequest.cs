namespace Tasky.Application.DTOs.Requests;

public record ListUpdateRequest(
    string? Name,
    string? ColorHex
);

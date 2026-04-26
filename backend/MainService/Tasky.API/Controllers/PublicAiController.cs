using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

[ApiController]
[Route("q")]
[AllowAnonymous]
public class TerminalAiController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;

    public TerminalAiController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet]
    public async Task<IActionResult> Ask([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q)) return BadRequest();

        var client = _httpClientFactory.CreateClient("gptunnel");
        var messages = new[] { new { role = "user", content = q } };

        var reply = await TryGetReplyAsync(client, "gemini-2.5-flash", messages)
                 ?? await TryGetReplyAsync(client, "claude-4.5-haiku", messages);

        return reply is not null
            ? Content(reply, "text/plain; charset=utf-8")
            : StatusCode(502, "Both models failed");
    }

    private static async Task<string?> TryGetReplyAsync(HttpClient client, string model, object messages)
    {
        try
        {
            var body = new { model, messages, useWalletBalance = true };
            using var response = await client.PostAsJsonAsync("v1/chat/completions", body);
            if (!response.IsSuccessStatusCode) return null;

            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
            return doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();
        }
        catch
        {
            return null;
        }
    }
}
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Tasky.Infrastructure.Persistence;
using Telegram.Bot;
using Tasky.Infrastructure.Services;
using Tasky.Application.Interfaces;
using Tasky.Infrastructure.ExternalServices;
using System.Net.Http.Headers;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.WriteIndented = true;
    });


// Configure Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
	c.EnableAnnotations();
	c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
	{
		Name = "Authorization",
		Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
		Scheme = "Bearer",
		BearerFormat = "JWT",
		In = Microsoft.OpenApi.Models.ParameterLocation.Header,
		Description = "Введите JWT токен (без Bearer)"
	});
	c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
	{
		{
			new Microsoft.OpenApi.Models.OpenApiSecurityScheme
			{
				Reference = new Microsoft.OpenApi.Models.OpenApiReference
				{
					Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
					Id = "Bearer"
				}
			},
			Array.Empty<string>()
		}
	});
});
builder.Services.AddScoped<IAiAssistantService, GptunnelService>();
builder.Services.AddScoped<Tasky.Application.Interfaces.IGoogleCalendarService, GoogleCalendarService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy
            .WithOrigins(
                "http://localhost:3000",
                "http://taskyai.ru",
                "https://taskyai.ru",
                "http://www.taskyai.ru",
                "https://www.taskyai.ru"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
    
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<Tasky.Application.Interfaces.IJwtService, Tasky.Infrastructure.Services.JwtService>();

builder.Services.AddScoped<Tasky.Application.Interfaces.ITaskService, Tasky.Infrastructure.Services.TaskService>();

builder.Services.AddScoped<Tasky.Application.Interfaces.IListService, Tasky.Infrastructure.Services.ListService>();

builder.Services.AddScoped<Tasky.Application.Interfaces.IUserService, Tasky.Infrastructure.Services.UserService>();

builder.Services.AddSingleton<ITelegramBotClient>(sp =>
{
    var token = builder.Configuration["Telegram:BotToken"]
        ?? throw new InvalidOperationException("Telegram bot token is not configured");
    return new TelegramBotClient(token);
});

builder.Services.AddHostedService<TelegramBotService>();

builder.Services.AddHttpClient("gptunnel", client =>
{
    client.BaseAddress = new Uri("https://gptunnel.ru/");
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", builder.Configuration["GPTunnel:ApiKey"]);
});

builder.Services.AddHttpClient("whisper", client =>
{
    client.BaseAddress = new Uri("https://api.groq.com/openai/");
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", builder.Configuration["Groq:ApiKey"]);
});

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"] ?? string.Empty))
        };
    });

var app = builder.Build();

await ApplyDatabaseMigrationsAsync(app);

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Tasky API v1");
    c.RoutePrefix = string.Empty; // Swagger будет доступен на корневом URL
});

app.UseCors("AllowAll");

// Remove HTTPS redirection for development
// app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static async Task ApplyDatabaseMigrationsAsync(WebApplication app)
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await dbContext.Database.MigrateAsync();
}

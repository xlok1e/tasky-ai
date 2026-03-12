using Microsoft.EntityFrameworkCore;
using Tasky.Infrastructure.Persistence;
using Tasky.Application.Interfaces;
using Tasky.Infrastructure.ExternalServices;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Configure Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<IAiAssistantService, GeminiService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();

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

app.UseAuthorization();

app.MapControllers();

app.Run();

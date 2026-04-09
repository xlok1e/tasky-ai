using Microsoft.EntityFrameworkCore;
using Tasky.Domain.Entities;

namespace Tasky.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<TaskList> Lists => Set<TaskList>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<ExecutionHistory> ExecutionHistory => Set<ExecutionHistory>();
    public DbSet<GoogleSyncState> GoogleSyncStates => Set<GoogleSyncState>();
    public DbSet<AiConversationHistory> AiConversationHistory => Set<AiConversationHistory>();
    public DbSet<NotificationQueue> NotificationsQueue => Set<NotificationQueue>();
    public DbSet<TelegramAuthToken> TelegramAuthTokens => Set<TelegramAuthToken>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.TelegramId)
            .IsUnique();

        modelBuilder.Entity<UserSettings>()
            .HasOne(s => s.User)
            .WithOne(u => u.Settings)
            .HasForeignKey<UserSettings>(s => s.UserId);

        modelBuilder.Entity<GoogleSyncState>()
            .HasOne(g => g.User)
            .WithOne(u => u.GoogleSyncState)
            .HasForeignKey<GoogleSyncState>(g => g.UserId);

        modelBuilder.Entity<TaskList>()
            .HasOne(l => l.User)
            .WithMany(u => u.Lists)
            .HasForeignKey(l => l.UserId);

        modelBuilder.Entity<TaskItem>()
            .HasOne(t => t.User)
            .WithMany(u => u.Tasks)
            .HasForeignKey(t => t.UserId);

        modelBuilder.Entity<TaskItem>()
            .HasOne(t => t.List)
            .WithMany(l => l.Tasks)
            .HasForeignKey(t => t.ListId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ExecutionHistory>()
            .HasOne(e => e.Task)
            .WithMany(t => t.ExecutionHistory)
            .HasForeignKey(e => e.TaskId);

        modelBuilder.Entity<NotificationQueue>()
            .HasOne(n => n.Task)
            .WithMany()
            .HasForeignKey(n => n.TaskId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

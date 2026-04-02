using Microsoft.EntityFrameworkCore;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Infrastructure.Persistence;

namespace Tasky.Infrastructure.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private readonly AppDbContext _db;

        public AnalyticsService(AppDbContext db)
        {
            _db = db;
        }

#pragma warning disable CS8629
        public async Task<TaskAnalyticsResponse> GetAnalyticsAsync(int userId, TaskAnalyticsRequest request)
        {
            var startDate = request.StartDate.ToUniversalTime();
            var endDate = request.EndDate.ToUniversalTime();

            var totalTasks = await _db.Tasks
                .Where(t => t.UserId == userId && t.CreatedAt >= startDate && t.CreatedAt <= endDate)
                .CountAsync();

            var completedTasks = await _db.Tasks
                .Where(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate)
                .CountAsync();

            var totalHoursSpent = await _db.ExecutionHistory
                .Include(eh => eh.Task)
                .Where(eh => eh.Task.UserId == userId && eh.FinishedAt.HasValue && eh.FinishedAt >= startDate && eh.FinishedAt <= endDate)
                .SumAsync(eh => (eh.FinishedAt.Value - eh.StartedAt).TotalHours);

            var averagePerTask = completedTasks > 0 ? totalHoursSpent / completedTasks : 0;

            var periodLength = (endDate - startDate).TotalDays;
            string mostProductivePeriod = "";
            List<HistogramDataPoint> histogramData = new();

            if (periodLength <= 1)
            {
                var hasData = await _db.Tasks
                    .AnyAsync(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate);

                if (hasData)
                {
                    var data = await _db.Tasks
                        .Where(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate)
                        .GroupBy(t => t.CompletedAt.Value.Hour)
                        .Select(g => new { Key = g.Key, Count = g.Count() })
                        .OrderByDescending(x => x.Count)
                        .FirstAsync();

                    mostProductivePeriod = $"{data.Key}:00 - {data.Key + 1}:00";
                }
                else
                {
                    mostProductivePeriod = "Нет данных";
                }

                histogramData = await _db.Tasks
                    .Where(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate)
                    .GroupBy(t => t.CompletedAt.Value.Hour)
                    .Select(g => new HistogramDataPoint { Period = $"{g.Key}:00", Value = g.Count() })
                    .ToListAsync();
            }
            else if (periodLength <= 7)
            {
                var hasData = await _db.Tasks
                    .AnyAsync(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate);

                if (hasData)
                {
                    var data = await _db.Tasks
                        .Where(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate)
                        .GroupBy(t => t.CompletedAt.Value.DayOfWeek)
                        .Select(g => new { Key = g.Key, Count = g.Count() })
                        .OrderByDescending(x => x.Count)
                        .FirstAsync();

                    mostProductivePeriod = data.Key.ToString();
                }
                else
                {
                    mostProductivePeriod = "Нет данных";
                }

                histogramData = await _db.Tasks
                    .Where(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate)
                    .GroupBy(t => t.CompletedAt.Value.DayOfWeek)
                    .Select(g => new HistogramDataPoint { Period = g.Key.ToString(), Value = g.Count() })
                    .ToListAsync();
            }
            else if (periodLength <= 31)
            {
                var hasData = await _db.Tasks
                    .AnyAsync(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate);

                if (hasData)
                {
                    var data = await _db.Tasks
                        .Where(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate)
                        .GroupBy(t => (int)((t.CompletedAt.Value - startDate).TotalDays / 7) + 1)
                        .Select(g => new { Key = g.Key, Count = g.Count() })
                        .OrderByDescending(x => x.Count)
                        .FirstAsync();

                    mostProductivePeriod = $"{data.Key}-я неделя";
                }
                else
                {
                    mostProductivePeriod = "Нет данных";
                }

                histogramData = await _db.Tasks
                    .Where(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate)
                    .GroupBy(t => (int)((t.CompletedAt.Value - startDate).TotalDays / 7) + 1)
                    .Select(g => new HistogramDataPoint { Period = $"{g.Key}-я неделя", Value = g.Count() })
                    .ToListAsync();
            }
            else
            {
                var hasData = await _db.Tasks
                    .AnyAsync(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate);

                if (hasData)
                {
                    var data = await _db.Tasks
                        .Where(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate)
                        .GroupBy(t => new { Year = t.CompletedAt.Value.Year, Month = t.CompletedAt.Value.Month })
                        .Select(g => new { Key = g.Key, Count = g.Count() })
                        .OrderByDescending(x => x.Count)
                        .FirstAsync();

                    mostProductivePeriod = new DateTime(data.Key.Year, data.Key.Month, 1).ToString("MMMM yyyy");
                }
                else
                {
                    mostProductivePeriod = "Нет данных";
                }

                histogramData = await _db.Tasks
                    .Where(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate)
                    .GroupBy(t => new { Year = t.CompletedAt.Value.Year, Month = t.CompletedAt.Value.Month })
                    .Select(g => new HistogramDataPoint { Period = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM yyyy"), Value = g.Count() })
                    .ToListAsync();
            }

            var pieChartData = await _db.Tasks
                .Where(t => t.UserId == userId && t.CompletedAt.HasValue && t.CompletedAt >= startDate && t.CompletedAt <= endDate)
                .Include(t => t.List)
                .GroupBy(t => t.List != null ? t.List.Name : "Inbox")
                .Select(g => new PieChartDataPoint { ListName = g.Key, TaskCount = g.Count() })
                .ToListAsync();

            return new TaskAnalyticsResponse
            {
                TotalTasks = totalTasks,
                CompletedTasks = completedTasks,
                TotalHoursSpent = totalHoursSpent,
                AveragePerTask = averagePerTask,
                MostProductivePeriod = mostProductivePeriod,
                HistogramData = histogramData,
                PieChartData = pieChartData
            };
        }
#pragma warning restore CS8629
    }
}
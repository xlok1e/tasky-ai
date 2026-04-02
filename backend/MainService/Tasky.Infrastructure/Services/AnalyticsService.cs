using System.Globalization;
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

        public async Task<TaskAnalyticsResponse> GetAnalyticsAsync(int userId, TaskAnalyticsRequest request)
        {
            var startDate = request.StartDate.ToUniversalTime();
            var endDate = request.EndDate.ToUniversalTime();
            var ruCulture = CultureInfo.GetCultureInfo("ru-RU");
            var periodDays = (endDate - startDate).TotalDays;

            // totalTasks = created in period; completedTasks = completed in period (intentionally different)
            var totalTasks = await _db.Tasks
                .CountAsync(t => t.UserId == userId && t.CreatedAt >= startDate && t.CreatedAt <= endDate);

            // Load all completed tasks with their lists in a single query
            var completedTasksRaw = await _db.Tasks
                .Include(t => t.List)
                .Where(t => t.UserId == userId && t.CompletedAt.HasValue
                            && t.CompletedAt >= startDate && t.CompletedAt <= endDate)
                .ToListAsync();

            // Load all execution history finished in the period in a single query
            var executionHistoryRaw = await _db.ExecutionHistory
                .Include(eh => eh.Task)
                .Where(eh => eh.Task.UserId == userId && eh.FinishedAt.HasValue
                             && eh.FinishedAt >= startDate && eh.FinishedAt <= endDate)
                .ToListAsync();

            var completedTasks = completedTasksRaw.Count;
            var totalHoursSpent = executionHistoryRaw
                .Sum(eh => (eh.FinishedAt!.Value - eh.StartedAt).TotalHours);
            var averagePerTask = completedTasks > 0 ? totalHoursSpent / completedTasks : 0;

            var histogramData = BuildHistogramData(
                completedTasksRaw, executionHistoryRaw, startDate, periodDays, ruCulture);

            var mostProductivePeriod = histogramData.Count > 0
                ? histogramData.MaxBy(x => x.Completed)!.Date
                : "Нет данных";

            var pieChartData = completedTasksRaw
                .GroupBy(t => new
                {
                    Name = t.List?.Name ?? "Inbox",
                    Color = t.List?.Color ?? "#6366f1"
                })
                .Select(g => new PieChartDataPoint
                {
                    ListName = g.Key.Name,
                    TaskCount = g.Count(),
                    Fill = g.Key.Color
                })
                .ToList();

            return new TaskAnalyticsResponse
            {
                TotalTasks = totalTasks,
                CompletedTasks = completedTasks,
                TotalHoursSpent = Math.Round(totalHoursSpent, 2),
                AveragePerTask = Math.Round(averagePerTask, 2),
                MostProductivePeriod = mostProductivePeriod,
                HistogramData = histogramData,
                PieChartData = pieChartData
            };
        }

        private static List<HistogramDataPoint> BuildHistogramData(
            List<Tasky.Domain.Entities.TaskItem> completedTasks,
            List<Tasky.Domain.Entities.ExecutionHistory> executionHistory,
            DateTime startDate,
            double periodDays,
            CultureInfo ruCulture)
        {
            if (periodDays <= 1)
                return BuildByHour(completedTasks, executionHistory);

            if (periodDays <= 7)
                return BuildByDayOfWeek(completedTasks, executionHistory, ruCulture);

            if (periodDays <= 31)
                return BuildByWeek(completedTasks, executionHistory, startDate);

            return BuildByMonth(completedTasks, executionHistory, ruCulture);
        }

        private static List<HistogramDataPoint> BuildByHour(
            List<Tasky.Domain.Entities.TaskItem> completedTasks,
            List<Tasky.Domain.Entities.ExecutionHistory> executionHistory)
        {
            var completedByHour = completedTasks
                .GroupBy(t => t.CompletedAt!.Value.Hour)
                .ToDictionary(g => g.Key, g => g.Count());

            var hoursByHour = executionHistory
                .GroupBy(eh => eh.FinishedAt!.Value.Hour)
                .ToDictionary(g => g.Key,
                    g => g.Sum(eh => (eh.FinishedAt!.Value - eh.StartedAt).TotalHours));

            return completedByHour.Keys
                .Union(hoursByHour.Keys)
                .OrderBy(h => h)
                .Select(h => new HistogramDataPoint
                {
                    Date = $"{h:D2}:00",
                    Completed = completedByHour.GetValueOrDefault(h, 0),
                    Hours = Math.Round(hoursByHour.GetValueOrDefault(h, 0), 1)
                })
                .ToList();
        }

        private static List<HistogramDataPoint> BuildByDayOfWeek(
            List<Tasky.Domain.Entities.TaskItem> completedTasks,
            List<Tasky.Domain.Entities.ExecutionHistory> executionHistory,
            CultureInfo ruCulture)
        {
            var completedByDay = completedTasks
                .GroupBy(t => t.CompletedAt!.Value.DayOfWeek)
                .ToDictionary(g => g.Key, g => g.Count());

            var hoursByDay = executionHistory
                .GroupBy(eh => eh.FinishedAt!.Value.DayOfWeek)
                .ToDictionary(g => g.Key,
                    g => g.Sum(eh => (eh.FinishedAt!.Value - eh.StartedAt).TotalHours));

            return completedByDay.Keys
                .Union(hoursByDay.Keys)
                .OrderBy(d => (int)d)
                .Select(d => new HistogramDataPoint
                {
                    Date = ruCulture.DateTimeFormat.GetDayName(d),
                    Completed = completedByDay.GetValueOrDefault(d, 0),
                    Hours = Math.Round(hoursByDay.GetValueOrDefault(d, 0), 1)
                })
                .ToList();
        }

        private static List<HistogramDataPoint> BuildByWeek(
            List<Tasky.Domain.Entities.TaskItem> completedTasks,
            List<Tasky.Domain.Entities.ExecutionHistory> executionHistory,
            DateTime startDate)
        {
            int WeekNumber(DateTime dt) => (int)((dt - startDate).TotalDays / 7) + 1;

            var completedByWeek = completedTasks
                .GroupBy(t => WeekNumber(t.CompletedAt!.Value))
                .ToDictionary(g => g.Key, g => g.Count());

            var hoursByWeek = executionHistory
                .GroupBy(eh => WeekNumber(eh.FinishedAt!.Value))
                .ToDictionary(g => g.Key,
                    g => g.Sum(eh => (eh.FinishedAt!.Value - eh.StartedAt).TotalHours));

            return completedByWeek.Keys
                .Union(hoursByWeek.Keys)
                .OrderBy(w => w)
                .Select(w => new HistogramDataPoint
                {
                    Date = $"{w}-я неделя",
                    Completed = completedByWeek.GetValueOrDefault(w, 0),
                    Hours = Math.Round(hoursByWeek.GetValueOrDefault(w, 0), 1)
                })
                .ToList();
        }

        private static List<HistogramDataPoint> BuildByMonth(
            List<Tasky.Domain.Entities.TaskItem> completedTasks,
            List<Tasky.Domain.Entities.ExecutionHistory> executionHistory,
            CultureInfo ruCulture)
        {
            var completedByMonth = completedTasks
                .GroupBy(t => (t.CompletedAt!.Value.Year, t.CompletedAt.Value.Month))
                .ToDictionary(g => g.Key, g => g.Count());

            var hoursByMonth = executionHistory
                .GroupBy(eh => (eh.FinishedAt!.Value.Year, eh.FinishedAt.Value.Month))
                .ToDictionary(g => g.Key,
                    g => g.Sum(eh => (eh.FinishedAt!.Value - eh.StartedAt).TotalHours));

            return completedByMonth.Keys
                .Union(hoursByMonth.Keys)
                .OrderBy(m => m.Year).ThenBy(m => m.Month)
                .Select(m => new HistogramDataPoint
                {
                    Date = new DateTime(m.Year, m.Month, 1).ToString("MMMM yyyy", ruCulture),
                    Completed = completedByMonth.GetValueOrDefault(m, 0),
                    Hours = Math.Round(hoursByMonth.GetValueOrDefault(m, 0), 1)
                })
                .ToList();
        }
    }
}

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
                completedTasksRaw, executionHistoryRaw, startDate, endDate, periodDays, ruCulture);

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
            DateTime endDate,
            double periodDays,
            CultureInfo ruCulture)
        {
            if (periodDays <= 1)
                return BuildByHour(completedTasks, executionHistory);

            if (periodDays <= 7)
                return BuildByDayInRange(completedTasks, executionHistory, startDate, endDate, ruCulture, includeDayName: true);

            if (periodDays <= 31)
                return BuildByDayInRange(completedTasks, executionHistory, startDate, endDate, ruCulture, includeDayName: false);

            return BuildByMonthInRange(completedTasks, executionHistory, startDate, endDate, ruCulture);
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

        /// <summary>
        /// Строит гистограмму по дням диапазона.
        /// Для недельного периода (includeDayName=true): метка "Пн, 25.03".
        /// Для месячного периода (includeDayName=false): метка "25".
        /// Все дни диапазона включаются, даже если задач нет (0).
        /// </summary>
        private static List<HistogramDataPoint> BuildByDayInRange(
            List<Tasky.Domain.Entities.TaskItem> completedTasks,
            List<Tasky.Domain.Entities.ExecutionHistory> executionHistory,
            DateTime startDate,
            DateTime endDate,
            CultureInfo ruCulture,
            bool includeDayName)
        {
            var completedByDate = completedTasks
                .GroupBy(t => t.CompletedAt!.Value.Date)
                .ToDictionary(g => g.Key, g => g.Count());

            var hoursByDate = executionHistory
                .GroupBy(eh => eh.FinishedAt!.Value.Date)
                .ToDictionary(g => g.Key,
                    g => g.Sum(eh => (eh.FinishedAt!.Value - eh.StartedAt).TotalHours));

            var totalDays = (int)(endDate.Date - startDate.Date).TotalDays + 1;

            return Enumerable.Range(0, totalDays)
                .Select(i => startDate.Date.AddDays(i))
                .Select(day => new HistogramDataPoint
                {
                    Date = includeDayName
                        ? $"{ruCulture.DateTimeFormat.GetAbbreviatedDayName(day.DayOfWeek)} {day.Day:D2}.{day.Month:D2}"
                        : $"{day.Day}",
                    Completed = completedByDate.GetValueOrDefault(day, 0),
                    Hours = Math.Round(hoursByDate.GetValueOrDefault(day, 0), 1)
                })
                .ToList();
        }

        /// <summary>
        /// Строит гистограмму по месяцам диапазона.
        /// Метка: "Январь" (если все месяцы в одном году) или "Январь 2025" (если разные годы).
        /// Все месяцы диапазона включаются, даже если задач нет (0).
        /// </summary>
        private static List<HistogramDataPoint> BuildByMonthInRange(
            List<Tasky.Domain.Entities.TaskItem> completedTasks,
            List<Tasky.Domain.Entities.ExecutionHistory> executionHistory,
            DateTime startDate,
            DateTime endDate,
            CultureInfo ruCulture)
        {
            var completedByMonth = completedTasks
                .GroupBy(t => (t.CompletedAt!.Value.Year, t.CompletedAt.Value.Month))
                .ToDictionary(g => g.Key, g => g.Count());

            var hoursByMonth = executionHistory
                .GroupBy(eh => (eh.FinishedAt!.Value.Year, eh.FinishedAt.Value.Month))
                .ToDictionary(g => g.Key,
                    g => g.Sum(eh => (eh.FinishedAt!.Value - eh.StartedAt).TotalHours));

            var isSingleYear = startDate.Year == endDate.Year;
            var dateFormat = isSingleYear ? "MMMM" : "MMMM yyyy";

            var firstMonth = new DateTime(startDate.Year, startDate.Month, 1);
            var lastMonth = new DateTime(endDate.Year, endDate.Month, 1);
            var totalMonths = ((lastMonth.Year - firstMonth.Year) * 12) + lastMonth.Month - firstMonth.Month + 1;

            return Enumerable.Range(0, totalMonths)
                .Select(i => firstMonth.AddMonths(i))
                .Select(month =>
                {
                    var key = (month.Year, month.Month);
                    return new HistogramDataPoint
                    {
                        Date = month.ToString(dateFormat, ruCulture),
                        Completed = completedByMonth.GetValueOrDefault(key, 0),
                        Hours = Math.Round(hoursByMonth.GetValueOrDefault(key, 0), 1)
                    };
                })
                .ToList();
        }
    }
}

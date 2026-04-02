using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Tasky.Application.DTOs.Requests;
using Tasky.Application.DTOs.Responses;
using Tasky.Application.Interfaces;
using Tasky.Domain.Entities;
using Tasky.Infrastructure.Persistence;

namespace Tasky.Infrastructure.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private const int DefaultTimeZoneOffsetMinutes = 180;

        private readonly AppDbContext _db;

        public AnalyticsService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<TaskAnalyticsResponse> GetAnalyticsAsync(int userId, TaskAnalyticsRequest request)
        {
            var startDateUtc = request.StartDate.ToUniversalTime();
            var endDateUtc = request.EndDate.ToUniversalTime();
            var timeZoneOffsetMinutes = request.TimeZoneOffsetMinutes ?? DefaultTimeZoneOffsetMinutes;
            var startDateLocal = ConvertToLocal(startDateUtc, timeZoneOffsetMinutes);
            var endDateLocal = ConvertToLocal(endDateUtc, timeZoneOffsetMinutes);
            var ruCulture = CultureInfo.GetCultureInfo("ru-RU");
            var periodDays = (endDateLocal - startDateLocal).TotalDays;

            var tasksInPeriod = await _db.Tasks
                .Include(t => t.List)
                .Where(t => t.UserId == userId
                    && t.StartAt != null
                    && t.StartAt >= startDateUtc && t.StartAt <= endDateUtc)
                .ToListAsync();

            var completedTasksRaw = await _db.Tasks
                .Include(t => t.List)
                .Where(t => t.UserId == userId
                    && t.CompletedAt.HasValue
                    && t.CompletedAt >= startDateUtc
                    && t.CompletedAt <= endDateUtc)
                .ToListAsync();

            var totalTasks = tasksInPeriod.Count;
            var completedTasks = completedTasksRaw.Count;
            var totalHoursSpent = tasksInPeriod
                .Where(t => t.StartAt.HasValue && t.EndAt.HasValue && !t.IsAllDay)
                .Sum(t => (t.EndAt!.Value - t.StartAt!.Value).TotalHours);
            var tasksWithDuration = tasksInPeriod
                .Count(t => t.StartAt.HasValue && t.EndAt.HasValue && !t.IsAllDay);
            var averagePerTask = tasksWithDuration > 0 ? totalHoursSpent / tasksWithDuration : 0;

            var histogramData = BuildHistogramData(
                tasksInPeriod,
                completedTasksRaw,
                startDateLocal,
                endDateLocal,
                periodDays,
                ruCulture,
                timeZoneOffsetMinutes);

            var mostProductivePeriod = tasksInPeriod.Count > 0
                ? ComputeMostProductivePeriod(tasksInPeriod, periodDays, ruCulture, timeZoneOffsetMinutes)
                : "Нет данных";

            var pieChartData = tasksInPeriod
                .GroupBy(t => new
                {
                    Name = t.List?.Name ?? "Inbox",
                    Color = t.List?.Color ?? "#6366f1"
                })
                .Select(g => new PieChartDataPoint
                {
                    ListName = g.Key.Name,
                    TaskCount = g.Count(),
                    CompletedCount = g.Count(t => t.CompletedAt.HasValue
                        && t.CompletedAt >= startDateUtc
                        && t.CompletedAt <= endDateUtc),
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
            List<TaskItem> allTasks,
            List<TaskItem> completedTasks,
            DateTime startDateLocal,
            DateTime endDateLocal,
            double periodDays,
            CultureInfo ruCulture,
            int timeZoneOffsetMinutes)
        {
            if (periodDays <= 1)
            {
                return BuildByHour(
                    allTasks,
                    completedTasks,
                    startDateLocal,
                    endDateLocal,
                    timeZoneOffsetMinutes);
            }

            if (periodDays <= 7)
            {
                return BuildByDayInRange(
                    allTasks,
                    completedTasks,
                    startDateLocal,
                    endDateLocal,
                    ruCulture,
                    includeDayName: true,
                    timeZoneOffsetMinutes);
            }

            if (periodDays <= 31)
            {
                return BuildByDayInRange(
                    allTasks,
                    completedTasks,
                    startDateLocal,
                    endDateLocal,
                    ruCulture,
                    includeDayName: false,
                    timeZoneOffsetMinutes);
            }

            return BuildByMonthInRange(
                allTasks,
                completedTasks,
                startDateLocal,
                endDateLocal,
                ruCulture,
                timeZoneOffsetMinutes);
        }

        private static string ComputeMostProductivePeriod(
            List<TaskItem> tasks,
            double periodDays,
            CultureInfo ruCulture,
            int timeZoneOffsetMinutes)
        {
            var withStartAt = tasks.Where(t => t.StartAt.HasValue).ToList();
            if (withStartAt.Count == 0) return "Нет данных";

            if (periodDays <= 1)
            {
                var bestHour = withStartAt
                    .Select(task => ConvertToLocal(task.StartAt!.Value, timeZoneOffsetMinutes))
                    .GroupBy(date => date.Hour)
                    .OrderByDescending(group => group.Count())
                    .ThenBy(group => group.Key)
                    .First()
                    .Key;

                return $"{bestHour:D2}:00";
            }

            if (periodDays <= 7)
            {
                var bestDay = withStartAt
                    .Select(task => ConvertToLocal(task.StartAt!.Value, timeZoneOffsetMinutes).Date)
                    .GroupBy(date => date)
                    .OrderByDescending(group => group.Count())
                    .ThenBy(group => group.Key)
                    .First()
                    .Key;

                return $"{FormatDayName(bestDay, ruCulture)}, {bestDay.ToString("d MMMM", ruCulture)}";
            }

            if (periodDays <= 31)
            {
                var bestDay = withStartAt
                    .Select(task => ConvertToLocal(task.StartAt!.Value, timeZoneOffsetMinutes).Date)
                    .GroupBy(date => date)
                    .OrderByDescending(group => group.Count())
                    .ThenBy(group => group.Key)
                    .First()
                    .Key;

                return bestDay.ToString("d MMMM yyyy", ruCulture);
            }

            var bestMonth = withStartAt
                .Select(task => ConvertToLocal(task.StartAt!.Value, timeZoneOffsetMinutes))
                .GroupBy(date => new DateTime(date.Year, date.Month, 1))
                .OrderByDescending(group => group.Count())
                .ThenBy(group => group.Key)
                .First()
                .Key;

            var isSingleYear = withStartAt
                .Select(task => ConvertToLocal(task.StartAt!.Value, timeZoneOffsetMinutes).Year)
                .Distinct()
                .Count() == 1;

            return bestMonth.ToString(isSingleYear ? "MMMM" : "MMMM yyyy", ruCulture);
        }

        private static List<HistogramDataPoint> BuildByHour(
            List<TaskItem> allTasks,
            List<TaskItem> completedTasks,
            DateTime startDateLocal,
            DateTime endDateLocal,
            int timeZoneOffsetMinutes)
        {
            var totalByHour = allTasks
                .Where(t => t.StartAt.HasValue)
                .GroupBy(task => ConvertToLocal(task.StartAt!.Value, timeZoneOffsetMinutes).Hour)
                .ToDictionary(group => group.Key, group => group.Count());

            var completedByHour = completedTasks
                .GroupBy(task => ConvertToLocal(task.CompletedAt!.Value, timeZoneOffsetMinutes).Hour)
                .ToDictionary(group => group.Key, group => group.Count());

            var hoursByHour = allTasks
                .Where(t => t.StartAt.HasValue && t.EndAt.HasValue && !t.IsAllDay)
                .GroupBy(t => ConvertToLocal(t.StartAt!.Value, timeZoneOffsetMinutes).Hour)
                .ToDictionary(
                    group => group.Key,
                    group => group.Sum(t => (t.EndAt!.Value - t.StartAt!.Value).TotalHours));

            var currentHour = new DateTime(
                startDateLocal.Year,
                startDateLocal.Month,
                startDateLocal.Day,
                startDateLocal.Hour,
                0,
                0);

            var hourPoints = new List<DateTime>();
            while (currentHour <= endDateLocal)
            {
                hourPoints.Add(currentHour);
                currentHour = currentHour.AddHours(1);
            }

            return hourPoints
                .Select(point => point.Hour)
                .Distinct()
                .Select(hour => new HistogramDataPoint
                {
                    Date = $"{hour:D2}:00",
                    Total = totalByHour.GetValueOrDefault(hour, 0),
                    Completed = completedByHour.GetValueOrDefault(hour, 0),
                    Hours = Math.Round(hoursByHour.GetValueOrDefault(hour, 0), 1)
                })
                .ToList();
        }

        private static List<HistogramDataPoint> BuildByDayInRange(
            List<TaskItem> allTasks,
            List<TaskItem> completedTasks,
            DateTime startDateLocal,
            DateTime endDateLocal,
            CultureInfo ruCulture,
            bool includeDayName,
            int timeZoneOffsetMinutes)
        {
            var totalByDate = allTasks
                .Where(t => t.StartAt.HasValue)
                .GroupBy(task => ConvertToLocal(task.StartAt!.Value, timeZoneOffsetMinutes).Date)
                .ToDictionary(group => group.Key, group => group.Count());

            var completedByDate = completedTasks
                .GroupBy(task => ConvertToLocal(task.CompletedAt!.Value, timeZoneOffsetMinutes).Date)
                .ToDictionary(group => group.Key, group => group.Count());

            var hoursByDate = allTasks
                .Where(t => t.StartAt.HasValue && t.EndAt.HasValue && !t.IsAllDay)
                .GroupBy(t => ConvertToLocal(t.StartAt!.Value, timeZoneOffsetMinutes).Date)
                .ToDictionary(
                    group => group.Key,
                    group => group.Sum(t => (t.EndAt!.Value - t.StartAt!.Value).TotalHours));

            var totalDays = (endDateLocal.Date - startDateLocal.Date).Days + 1;

            return Enumerable.Range(0, totalDays)
                .Select(offset => startDateLocal.Date.AddDays(offset))
                .Select(day => new HistogramDataPoint
                {
                    Date = includeDayName
                        ? $"{FormatDayName(day, ruCulture)} {day:dd.MM}"
                        : $"{day.Day}",
                    Total = totalByDate.GetValueOrDefault(day, 0),
                    Completed = completedByDate.GetValueOrDefault(day, 0),
                    Hours = Math.Round(hoursByDate.GetValueOrDefault(day, 0), 1)
                })
                .ToList();
        }

        private static List<HistogramDataPoint> BuildByMonthInRange(
            List<TaskItem> allTasks,
            List<TaskItem> completedTasks,
            DateTime startDateLocal,
            DateTime endDateLocal,
            CultureInfo ruCulture,
            int timeZoneOffsetMinutes)
        {
            var totalByMonth = allTasks
                .Where(t => t.StartAt.HasValue)
                .Select(task => ConvertToLocal(task.StartAt!.Value, timeZoneOffsetMinutes))
                .GroupBy(date => (date.Year, date.Month))
                .ToDictionary(group => group.Key, group => group.Count());

            var completedByMonth = completedTasks
                .Select(task => ConvertToLocal(task.CompletedAt!.Value, timeZoneOffsetMinutes))
                .GroupBy(date => (date.Year, date.Month))
                .ToDictionary(group => group.Key, group => group.Count());

            var hoursByMonth = allTasks
                .Where(t => t.StartAt.HasValue && t.EndAt.HasValue && !t.IsAllDay)
                .Select(t => new
                {
                    StartAtLocal = ConvertToLocal(t.StartAt!.Value, timeZoneOffsetMinutes),
                    HoursSpent = (t.EndAt!.Value - t.StartAt!.Value).TotalHours
                })
                .GroupBy(t => (t.StartAtLocal.Year, t.StartAtLocal.Month))
                .ToDictionary(group => group.Key, group => group.Sum(t => t.HoursSpent));

            var firstMonth = new DateTime(startDateLocal.Year, startDateLocal.Month, 1);
            var lastMonth = new DateTime(endDateLocal.Year, endDateLocal.Month, 1);
            var totalMonths = ((lastMonth.Year - firstMonth.Year) * 12) + lastMonth.Month - firstMonth.Month + 1;
            var isSingleYear = firstMonth.Year == lastMonth.Year;
            var dateFormat = isSingleYear ? "MMMM" : "MMMM yyyy";

            return Enumerable.Range(0, totalMonths)
                .Select(offset => firstMonth.AddMonths(offset))
                .Select(month => new HistogramDataPoint
                {
                    Date = month.ToString(dateFormat, ruCulture),
                    Total = totalByMonth.GetValueOrDefault((month.Year, month.Month), 0),
                    Completed = completedByMonth.GetValueOrDefault((month.Year, month.Month), 0),
                    Hours = Math.Round(hoursByMonth.GetValueOrDefault((month.Year, month.Month), 0), 1)
                })
                .ToList();
        }

        private static DateTime ConvertToLocal(DateTime utcDateTime, int timeZoneOffsetMinutes)
        {
            return DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc).AddMinutes(timeZoneOffsetMinutes);
        }

        private static string FormatDayName(DateTime date, CultureInfo culture)
        {
            var abbreviatedDayName = culture.DateTimeFormat.GetAbbreviatedDayName(date.DayOfWeek);
            if (string.IsNullOrWhiteSpace(abbreviatedDayName))
            {
                return abbreviatedDayName;
            }

            return char.ToUpper(abbreviatedDayName[0], culture) + abbreviatedDayName[1..];
        }
    }
}

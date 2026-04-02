namespace Tasky.Application.DTOs.Responses
{
    public class TaskAnalyticsResponse
    {
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public double TotalHoursSpent { get; set; }
        public double AveragePerTask { get; set; }
        public string MostProductivePeriod { get; set; } = string.Empty;
        public List<HistogramDataPoint> HistogramData { get; set; } = new();
        public List<PieChartDataPoint> PieChartData { get; set; } = new();
    }

    public class HistogramDataPoint
    {
        public string Period { get; set; } = string.Empty;
        public int Value { get; set; }
    }

    public class PieChartDataPoint
    {
        public string ListName { get; set; } = string.Empty;
        public int TaskCount { get; set; }
    }
}
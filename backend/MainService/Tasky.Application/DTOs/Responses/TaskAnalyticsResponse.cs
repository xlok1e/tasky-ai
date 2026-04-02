using System.Text.Json.Serialization;

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
        [JsonPropertyName("date")]
        public string Date { get; set; } = string.Empty;

        // Completed tasks count in the sub-period (maps to "desktop" bar in chart)
        [JsonPropertyName("desktop")]
        public int Completed { get; set; }

        // Hours spent in the sub-period (maps to "mobile" bar in chart)
        [JsonPropertyName("mobile")]
        public double Hours { get; set; }
    }

    public class PieChartDataPoint
    {
        [JsonPropertyName("listName")]
        public string ListName { get; set; } = string.Empty;

        [JsonPropertyName("taskCount")]
        public int TaskCount { get; set; }

        // Hex color from the list entity, used as fill in pie chart
        [JsonPropertyName("fill")]
        public string Fill { get; set; } = string.Empty;
    }
}

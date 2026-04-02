using System.Text.Json.Serialization;

namespace Tasky.Application.DTOs.Responses
{
    public class TaskAnalyticsResponse
    {
        /// <summary>Количество задач, созданных за период.</summary>
        public int TotalTasks { get; set; }

        /// <summary>Количество задач, завершённых за период.</summary>
        public int CompletedTasks { get; set; }

        /// <summary>Суммарное время выполнения задач за период (часы).</summary>
        public double TotalHoursSpent { get; set; }

        /// <summary>Среднее время на одну завершённую задачу (часы).</summary>
        public double AveragePerTask { get; set; }

        /// <summary>Метка подпериода с наибольшим числом завершённых задач.</summary>
        public string MostProductivePeriod { get; set; } = string.Empty;

        /// <summary>
        /// Данные для гистограммы. Гранулярность зависит от длины периода:
        /// день → по часам, неделя → по дням, месяц → по дням месяца, год → по месяцам.
        /// </summary>
        public List<HistogramDataPoint> HistogramData { get; set; } = new();

        /// <summary>Данные для круговой диаграммы по спискам задач.</summary>
        public List<PieChartDataPoint> PieChartData { get; set; } = new();
    }

    /// <summary>
    /// Одна точка на гистограмме статистики задач.
    /// </summary>
    public class HistogramDataPoint
    {
        /// <summary>
        /// Метка временного подпериода.
        /// Формат зависит от выбранного периода:
        /// "09:00" (день), "Пн, 25.03" (неделя), "25" (месяц), "Январь" / "Январь 2025" (год).
        /// </summary>
        [JsonPropertyName("date")]
        public string Date { get; set; } = string.Empty;

        /// <summary>Количество завершённых задач в подпериоде (отображается как "desktop" в графике).</summary>
        [JsonPropertyName("desktop")]
        public int Completed { get; set; }

        /// <summary>Суммарное время выполнения задач в подпериоде, часы (отображается как "mobile" в графике).</summary>
        [JsonPropertyName("mobile")]
        public double Hours { get; set; }
    }

    public class PieChartDataPoint
    {
        [JsonPropertyName("listName")]
        public string ListName { get; set; } = string.Empty;

        [JsonPropertyName("taskCount")]
        public int TaskCount { get; set; }

        /// <summary>Hex-цвет списка, используется как fill в круговой диаграмме.</summary>
        [JsonPropertyName("fill")]
        public string Fill { get; set; } = string.Empty;
    }
}

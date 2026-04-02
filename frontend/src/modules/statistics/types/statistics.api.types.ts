export interface StatisticsRequest {
	startDate: string
	endDate: string
	timeZoneOffsetMinutes: number
}

export interface StatisticsHistogramResponseItem {
	date: string
	total: number
	desktop: number
	mobile: number
}

export interface StatisticsPieChartResponseItem {
	listName: string
	taskCount: number
	completedCount: number
	fill: string
}

export interface StatisticsResponse {
	totalTasks: number
	completedTasks: number
	totalHoursSpent: number
	averagePerTask: number
	mostProductivePeriod: string
	histogramData: StatisticsHistogramResponseItem[]
	pieChartData: StatisticsPieChartResponseItem[]
}

import type { DateRange } from 'react-day-picker'

export type StatisticsPeriodPreset =
	| 'day'
	| 'week'
	| 'month'
	| 'year'
	| 'custom'
export type StatisticsPresetTabValue = Exclude<StatisticsPeriodPreset, 'custom'>

export interface StatisticsDateRange {
	startDate: Date
	endDate: Date
}

export interface StatisticsHistogramItem {
	date: string
	totalTasks: number
	completedTasks: number
	hoursSpent: number
}

export interface StatisticsPieSliceItem {
	listName: string
	taskCount: number
	completedCount: number
	fill: string
}

export interface StatisticsData {
	totalTasks: number
	completedTasks: number
	totalHoursSpent: number
	averagePerTask: number
	mostProductivePeriod: string
	histogramData: StatisticsHistogramItem[]
	pieChartData: StatisticsPieSliceItem[]
}

export interface StatisticsMetricCardItem {
	id: string
	label: string
	value: string
}

export interface StatisticsPeriodTabItem {
	value: StatisticsPresetTabValue
	label: string
}

export interface StatisticsDateRangePickerController {
	isOpen: boolean
	buttonLabel: string
	rangeLabel: string
	draftRange: DateRange | undefined
	displayedMonth: Date
	onOpenChange: (open: boolean) => void
	onSelectRange: (range: DateRange | undefined) => void
	onMonthChange: (month: Date) => void
	onCancel: () => void
	onApply: () => void
}

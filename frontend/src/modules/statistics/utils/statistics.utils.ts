import {
	endOfDay,
	endOfMonth,
	endOfWeek,
	endOfYear,
	format,
	isSameDay,
	startOfDay,
	startOfMonth,
	startOfWeek,
	startOfYear,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import type { StatisticsResponse } from '@modules/statistics/types/statistics.api.types'
import {
	STATISTICS_PIE_FALLBACK_COLORS,
	STATISTICS_PERIOD_TABS,
} from '@modules/statistics/constants/statistics.constants'
import type {
	StatisticsData,
	StatisticsDateRange,
	StatisticsMetricCardItem,
	StatisticsPeriodPreset,
	StatisticsPieSliceItem,
	StatisticsPresetTabValue,
} from '@modules/statistics/types/statistics.types'

const WEEK_STARTS_ON = 1 as const
const DEFAULT_PIE_FILL = STATISTICS_PIE_FALLBACK_COLORS[0]
const ISO_HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function normalizeHoursValue(value: number): string {
	return new Intl.NumberFormat('ru-RU', {
		minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
		maximumFractionDigits: 1,
	}).format(value)
}

export function createStatisticsRangeFromPreset(
	preset: StatisticsPresetTabValue,
	referenceDate: Date = new Date(),
): StatisticsDateRange {
	if (preset === 'day') {
		return {
			startDate: startOfDay(referenceDate),
			endDate: endOfDay(referenceDate),
		}
	}

	if (preset === 'week') {
		return {
			startDate: startOfWeek(referenceDate, { weekStartsOn: WEEK_STARTS_ON }),
			endDate: endOfWeek(referenceDate, { weekStartsOn: WEEK_STARTS_ON }),
		}
	}

	if (preset === 'month') {
		return {
			startDate: startOfMonth(referenceDate),
			endDate: endOfMonth(referenceDate),
		}
	}

	return {
		startDate: startOfYear(referenceDate),
		endDate: endOfYear(referenceDate),
	}
}

export function normalizeStatisticsDateRange(
	range: StatisticsDateRange,
): StatisticsDateRange {
	return {
		startDate: startOfDay(range.startDate),
		endDate: endOfDay(range.endDate),
	}
}

export function validateStatisticsDateRange(
	range: StatisticsDateRange,
): string | null {
	if (
		Number.isNaN(range.startDate.getTime()) ||
		Number.isNaN(range.endDate.getTime())
	) {
		return 'Некорректный период статистики.'
	}

	if (range.startDate.getTime() > range.endDate.getTime()) {
		return 'Дата начала должна быть раньше даты окончания.'
	}

	return null
}

export function resolveStatisticsPreset(
	range: StatisticsDateRange,
	referenceDate: Date = new Date(),
): StatisticsPeriodPreset {
	return (
		STATISTICS_PERIOD_TABS.find(tab => {
			const presetRange = createStatisticsRangeFromPreset(
				tab.value,
				referenceDate,
			)
			return (
				presetRange.startDate.getTime() === range.startDate.getTime() &&
				presetRange.endDate.getTime() === range.endDate.getTime()
			)
		})?.value ?? 'custom'
	)
}

export function mapStatisticsResponseToData(
	response: StatisticsResponse,
): StatisticsData {
	return {
		totalTasks: response.totalTasks,
		completedTasks: response.completedTasks,
		totalHoursSpent: response.totalHoursSpent,
		averagePerTask: response.averagePerTask,
		mostProductivePeriod: response.mostProductivePeriod,
		histogramData: response.histogramData.map(item => ({
			date: item.date,
			totalTasks: item.total,
			completedTasks: item.desktop,
			hoursSpent: item.mobile,
		})),
		pieChartData: response.pieChartData.map((item, index) => ({
			listName: item.listName,
			taskCount: item.taskCount,
			completedCount: item.completedCount,
			fill: resolvePieSliceFill(item.fill, index, item.listName),
		})),
	}
}

export function createStatisticsMetricCards(
	data: StatisticsData | null,
): StatisticsMetricCardItem[] {
	return [
		{
			id: 'totalTasks',
			label: 'Всего задач',
			value: data ? String(data.totalTasks) : '0',
		},
		{
			id: 'completedTasks',
			label: 'Выполнено',
			value: data ? String(data.completedTasks) : '0',
		},
		{
			id: 'totalHoursSpent',
			label: 'Затрачено часов',
			value: data ? normalizeHoursValue(data.totalHoursSpent) : '0',
		},
		{
			id: 'averagePerTask',
			label: 'Среднее на задачу',
			value: data ? formatAveragePerTaskValue(data.averagePerTask) : '0ч',
		},
	]
}

export function formatAveragePerTaskValue(value: number): string {
	return `${normalizeHoursValue(value)}ч`
}

export function formatDurationValue(value: number): string {
	return `${normalizeHoursValue(value)} ч`
}

export function formatStatisticsDateRangeLabel(
	range: StatisticsDateRange,
): string {
	if (isSameDay(range.startDate, range.endDate)) {
		return format(range.startDate, 'd MMMM yyyy', { locale: ru })
	}

	return `${format(range.startDate, 'd MMM', { locale: ru })} - ${format(
		range.endDate,
		'd MMM yyyy',
		{
			locale: ru,
		},
	)}`
}

export function formatHistogramTickLabel(value: string): string {
	if (value.length <= 12) {
		return value
	}

	const [monthName] = value.split(' ')
	if (monthName.length <= 3) {
		return value
	}

	return value.replace(monthName, `${monthName.slice(0, 3)}.`)
}

export function createStatisticsRequestPayload(range: StatisticsDateRange): {
	startDate: string
	endDate: string
	timeZoneOffsetMinutes: number
} {
	return {
		startDate: range.startDate.toISOString(),
		endDate: range.endDate.toISOString(),
		timeZoneOffsetMinutes: -range.startDate.getTimezoneOffset(),
	}
}

export function createEmptyStatisticsData(): StatisticsData {
	return {
		totalTasks: 0,
		completedTasks: 0,
		totalHoursSpent: 0,
		averagePerTask: 0,
		mostProductivePeriod: 'Нет данных',
		histogramData: [],
		pieChartData: [],
	}
}

function resolvePieSliceFill(
	fill: string,
	index: number,
	listName: string,
): string {
	if (listName === 'Inbox') {
		return 'var(--primary)'
	}

	if (ISO_HEX_COLOR_PATTERN.test(fill)) {
		return fill
	}

	return (
		STATISTICS_PIE_FALLBACK_COLORS[
			index % STATISTICS_PIE_FALLBACK_COLORS.length
		] ?? DEFAULT_PIE_FILL
	)
}

export function createPieChartConfig(
	data: StatisticsPieSliceItem[],
): Record<string, { label: string; color: string }> {
	return data.reduce<Record<string, { label: string; color: string }>>(
		(config, item) => {
			config[item.listName] = {
				label: item.listName,
				color: item.fill,
			}
			return config
		},
		{},
	)
}

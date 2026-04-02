'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@shared/ui/chart'
import {
	STATISTICS_BAR_COLOR,
	STATISTICS_GRID_COLOR,
} from '@modules/statistics/constants/statistics.constants'
import type { StatisticsHistogramItem } from '@modules/statistics/types/statistics.types'
import {
	formatDurationValue,
	formatHistogramTickLabel,
} from '@modules/statistics/utils/statistics.utils'

const completedChartConfig = {
	totalTasks: {
		label: 'Всего задач',
		color: STATISTICS_BAR_COLOR,
	},
} satisfies ChartConfig

function isStatisticsHistogramItem(
	value: unknown,
): value is StatisticsHistogramItem {
	if (typeof value !== 'object' || value === null) {
		return false
	}

	return (
		'date' in value &&
		'totalTasks' in value &&
		'completedTasks' in value &&
		'hoursSpent' in value
	)
}

function renderCompletedTooltip(
	value: unknown,
	_name: unknown,
	entry: { payload?: unknown },
): React.ReactNode {
	const payload = 'payload' in entry ? entry.payload : null
	if (!isStatisticsHistogramItem(payload)) {
		return null
	}

	return (
		<div className='flex w-full flex-col gap-1'>
			<div className='flex min-w-[140px] items-center justify-between gap-4'>
				<span className='text-muted-foreground'>Всего</span>
				<span className='font-medium text-foreground'>{String(value)}</span>
			</div>
			<div className='flex items-center justify-between gap-4'>
				<span className='text-muted-foreground'>Завершено</span>
				<span className='font-medium text-foreground'>
					{payload.completedTasks}
				</span>
			</div>
			<div className='flex items-center justify-between gap-4'>
				<span className='text-muted-foreground'>Часы</span>
				<span className='font-medium text-foreground'>
					{formatDurationValue(payload.hoursSpent)}
				</span>
			</div>
		</div>
	)
}

interface StatisticsCompletedChartProps {
	data: StatisticsHistogramItem[]
	isLoading: boolean
}

export function StatisticsCompletedChart({
	data,
	isLoading,
}: StatisticsCompletedChartProps) {
	return (
		<section className='flex flex-col gap-6'>
			<h2 className='text-[22px] leading-6 font-normal text-foreground'>
				Задачи
			</h2>
			{isLoading ? (
				<div className='h-[220px] animate-pulse rounded-[8px] border border-border bg-muted/50' />
			) : data.length === 0 ? (
				<div className='flex h-[220px] items-center justify-center rounded-[8px] border border-border text-sm text-muted-foreground'>
					Нет данных за выбранный период
				</div>
			) : (
				<ChartContainer
					config={completedChartConfig}
					className='h-[220px] w-full aspect-auto'
				>
					<BarChart
						data={data}
						margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
					>
						<CartesianGrid
							stroke={STATISTICS_GRID_COLOR}
							vertical
							horizontal
							strokeDasharray='0 0'
						/>
						<XAxis
							dataKey='date'
							axisLine={false}
							tickLine={false}
							minTickGap={16}
							tickFormatter={formatHistogramTickLabel}
						/>
						<YAxis
							allowDecimals={false}
							axisLine={false}
							tickLine={false}
							width={40}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									indicator='line'
									formatter={renderCompletedTooltip}
								/>
							}
						/>
						<Bar
							dataKey='totalTasks'
							fill='var(--color-totalTasks)'
							radius={[4, 4, 0, 0]}
							maxBarSize={28}
						/>
					</BarChart>
				</ChartContainer>
			)}
		</section>
	)
}

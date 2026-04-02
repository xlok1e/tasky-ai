import { StatisticsDateRangePicker } from '@modules/statistics/components/StatisticsDateRangePicker'
import { StatisticsPeriodTabs } from '@modules/statistics/components/StatisticsPeriodTabs'
import type {
	StatisticsDateRangePickerController,
	StatisticsPeriodTabItem,
	StatisticsPeriodPreset,
	StatisticsPresetTabValue,
} from '@modules/statistics/types/statistics.types'

interface StatisticsHeaderProps {
	periodTabs: StatisticsPeriodTabItem[]
	activePreset: StatisticsPeriodPreset
	dateRangePicker: StatisticsDateRangePickerController
	onPresetChange: (preset: StatisticsPresetTabValue) => void
}

export function StatisticsHeader({
	periodTabs,
	activePreset,
	dateRangePicker,
	onPresetChange,
}: StatisticsHeaderProps) {
	return (
		<header className='flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'>
			<h1 className='text-[22px] leading-6 font-bold text-foreground'>
				Статистика
			</h1>

			<div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
				<StatisticsPeriodTabs
					tabs={periodTabs}
					activeValue={activePreset}
					onValueChange={onPresetChange}
				/>
				<StatisticsDateRangePicker controller={dateRangePicker} />
			</div>
		</header>
	)
}

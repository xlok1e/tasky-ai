'use client'

import { Calendar } from '@shared/ui/calendar'
import { Button } from '@shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover'
import {
	STATISTICS_PERIOD_ACTIVE_BACKGROUND,
	STATISTICS_PERIOD_TEXT_COLOR,
} from '@modules/statistics/constants/statistics.constants'
import type { StatisticsDateRangePickerController } from '@modules/statistics/types/statistics.types'

interface StatisticsDateRangePickerProps {
	controller: StatisticsDateRangePickerController
}

export function StatisticsDateRangePicker({
	controller,
}: StatisticsDateRangePickerProps) {
	return (
		<Popover open={controller.isOpen} onOpenChange={controller.onOpenChange}>
			<PopoverTrigger asChild>
				<Button
					type='button'
					variant='secondary'
					className='h-[40px] rounded-[6px] px-4 text-[18px]'
					style={{
						backgroundColor: STATISTICS_PERIOD_ACTIVE_BACKGROUND,
						color: STATISTICS_PERIOD_TEXT_COLOR,
					}}
				>
					{controller.buttonLabel}
				</Button>
			</PopoverTrigger>
			<PopoverContent align='end' className='w-[336px] p-0'>
				<div className='border-b border-border px-4 py-3'>
					<p className='text-sm font-medium text-foreground'>
						Выберите диапазон
					</p>
					<p className='text-sm text-muted-foreground'>
						{controller.rangeLabel}
					</p>
				</div>
				<div className='px-3 py-3'>
					<Calendar
						mode='range'
						selected={controller.draftRange}
						onSelect={controller.onSelectRange}
						month={controller.displayedMonth}
						onMonthChange={controller.onMonthChange}
						className='p-0'
						classNames={{
							selected: 'bg-primary text-primary-foreground rounded-md',
							range_start: '[&.rdp-selected]:rounded-r-none',
							range_end: '[&.rdp-selected]:rounded-l-none',
							range_middle:
								'[&.rdp-selected]:!rounded-none [&.rdp-selected]:!bg-primary/15 [&.rdp-selected]:!text-foreground',
						}}
					/>
				</div>
				<div className='flex items-center gap-2 border-t border-border px-4 py-3'>
					<Button
						type='button'
						variant='ghost'
						className='flex-1'
						onClick={controller.onCancel}
					>
						Отмена
					</Button>
					<Button type='button' className='flex-1' onClick={controller.onApply}>
						Применить
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}

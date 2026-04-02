'use client'

import { addMonths, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as React from 'react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@shared/lib/utils'
import { buttonVariants } from '@shared/ui/button'

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	month: monthProp,
	onMonthChange,
	...props
}: React.ComponentProps<typeof DayPicker>) {
	const [internalMonth, setInternalMonth] = React.useState<Date>(
		(monthProp as Date | undefined) ?? new Date(),
	)

	const activeMonth = (monthProp as Date | undefined) ?? internalMonth

	const handleMonthChange = (next: Date) => {
		if (onMonthChange) {
			onMonthChange(next)
		} else {
			setInternalMonth(next)
		}
	}

	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			month={activeMonth}
			onMonthChange={handleMonthChange}
			locale={ru}
			className={cn('p-2', className)}
			formatters={{
				formatWeekdayName: day => format(day, 'EEEEEE', { locale: ru }),
			}}
			classNames={{
				months: 'flex flex-col sm:flex-row gap-2',
				month: 'flex flex-col gap-1',
				month_caption: 'hidden',
				caption: 'hidden',
				caption_label: 'hidden',
				nav: 'hidden',
				button_previous: 'hidden',
				button_next: 'hidden',
				month_grid: 'w-full border-collapse table-fixed',
				weekdays: '',
				weekday:
					'pb-0.5 text-center text-[0.7rem] font-normal text-muted-foreground',
				week: '',
				day: 'p-[1px]',
				day_button: cn(
					buttonVariants({ variant: 'ghost' }),
					'h-auto! w-full aspect-square rounded-md p-0 font-normal aria-selected:opacity-100',
				),
				selected:
					'rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
				today: 'rounded-md bg-accent text-accent-foreground',
				outside: 'text-muted-foreground opacity-50 aria-selected:bg-accent/50',
				disabled: 'text-muted-foreground opacity-50',
				hidden: 'invisible',
				footer: 'border-t-0',
				...classNames,
			}}
			footer={
				<div className='flex items-center justify-between'>
					<button
						type='button'
						aria-label='Предыдущий месяц'
						onClick={() => handleMonthChange(addMonths(activeMonth, -1))}
						className={cn(
							buttonVariants({ variant: 'ghost' }),
							'size-8 p-0 opacity-60 hover:opacity-100',
						)}
					>
						<ChevronLeft className='size-4' />
					</button>
					<span className='text-sm font-medium capitalize'>
						{format(activeMonth, 'LLLL yyyy', { locale: ru })}
					</span>
					<button
						type='button'
						aria-label='Следующий месяц'
						onClick={() => handleMonthChange(addMonths(activeMonth, 1))}
						className={cn(
							buttonVariants({ variant: 'ghost' }),
							'size-8 p-0 opacity-60 hover:opacity-100',
						)}
					>
						<ChevronRight className='size-4' />
					</button>
				</div>
			}
			{...props}
		/>
	)
}

export { Calendar }

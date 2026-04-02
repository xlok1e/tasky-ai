'use client'

import { useEffect, useMemo, useState } from 'react'
import {
	addDays,
	endOfISOWeek,
	format,
	isToday,
	isValid,
	startOfISOWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import {
	CalendarDays,
	CalendarRange,
	Flag,
	Inbox,
	Sunrise,
	Sun,
	Trash2,
	X,
} from 'lucide-react'
import { toastMessage } from '@/shared/toast/toast'
import { cn } from '@shared/lib/utils'
import { Button } from '@shared/ui/button'
import { Calendar } from '@shared/ui/calendar'
import { Input } from '@shared/ui/input'
import { Checkbox } from '@shared/ui/checkbox'
import { Label } from '@shared/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover'
import { Textarea } from '@shared/ui/textarea'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@shared/ui/dialog'
import { useTaskModal } from '../store/task-modal.store'
import { useTasksStore } from '../store/tasks.store'
import { useListsStore } from '@modules/lists/store/lists.store'
import { TaskPriority } from '../types/task.enums'

type DateTabValue = 'start' | 'end'

const DEFAULT_TIME_BY_TAB: Record<DateTabValue, string> = {
	start: '09:00',
	end: '18:00',
}

const LISTS_WITH_SCROLL_COUNT = 5

interface PriorityOption {
	value: TaskPriority
	label: string
	colorClassName: string
}

const PRIORITY_OPTIONS: PriorityOption[] = [
	{
		value: TaskPriority.Low,
		label: 'Низкий',
		colorClassName: 'text-muted-foreground',
	},
	{
		value: TaskPriority.Medium,
		label: 'Средний',
		colorClassName: 'text-yellow-600',
	},
	{
		value: TaskPriority.High,
		label: 'Высокий',
		colorClassName: 'text-destructive',
	},
]

function isDateTabValue(value: string): value is DateTabValue {
	return value === 'start' || value === 'end'
}

function parseTimeValue(
	timeValue: string,
): { hours: number; minutes: number } | null {
	const matchedTime = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeValue)
	if (!matchedTime) {
		return null
	}

	const [, hoursValue, minutesValue] = matchedTime
	return {
		hours: Number(hoursValue),
		minutes: Number(minutesValue),
	}
}

function normalizeTimeInput(value: string): string {
	const digitsOnly = value.replace(/\D/g, '').slice(0, 4)
	if (digitsOnly.length <= 2) {
		return digitsOnly
	}
	return `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2)}`
}

function isCompleteTimeValue(value: string): boolean {
	return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)
}

function applyTimeToDate(dateValue: Date, timeValue: string): Date {
	const parsedTime = parseTimeValue(timeValue)
	const nextDate = new Date(dateValue)
	if (!parsedTime) {
		return nextDate
	}

	nextDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0)
	return nextDate
}

function toTimeInputValue(dateValue: Date | null): string {
	if (!dateValue) {
		return ''
	}
	return format(dateValue, 'HH:mm')
}

function formatDateLabel(dateValue: Date): string {
	if (isToday(dateValue)) {
		return `Сегодня, ${format(dateValue, 'd MMMM', { locale: ru })}`
	}
	return format(dateValue, 'd MMMM', { locale: ru })
}

function toDateRangeLabel(
	startDate: Date | null,
	endDate: Date | null,
): string {
	if (!startDate && !endDate) {
		return 'Без даты'
	}

	if (startDate && !endDate) {
		return formatDateLabel(startDate)
	}

	if (!startDate && endDate) {
		return `До ${format(endDate, 'd MMMM', { locale: ru })}`
	}

	if (startDate && endDate) {
		return `${format(startDate, 'd MMM', { locale: ru })} - ${format(endDate, 'd MMM', { locale: ru })}`
	}

	return 'Без даты'
}

export function TaskModal() {
	const { isOpen, editingTask, prefill, close } = useTaskModal()
	const { addTask, updateTask, deleteTask } = useTasksStore()
	const lists = useListsStore(s => s.lists)

	const [isEditMode, setIsEditMode] = useState(false)
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [isCompleted, setIsCompleted] = useState(false)
	const [startDate, setStartDate] = useState<Date | null>(null)
	const [endDate, setEndDate] = useState<Date | null>(null)
	const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Low)
	const [listId, setListId] = useState<number | null>(null)
	const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)
	const [isPriorityPopoverOpen, setIsPriorityPopoverOpen] = useState(false)
	const [isListPopoverOpen, setIsListPopoverOpen] = useState(false)
	const [dateTab, setDateTab] = useState<DateTabValue>('start')
	const [draftStartDate, setDraftStartDate] = useState<Date | null>(null)
	const [draftEndDate, setDraftEndDate] = useState<Date | null>(null)
	const [draftStartTime, setDraftStartTime] = useState('')
	const [draftEndTime, setDraftEndTime] = useState('')
	const [draftMonth, setDraftMonth] = useState<Date>(new Date())

	useEffect(() => {
		if (isOpen) {
			setIsEditMode(!!editingTask)
			setTitle(editingTask?.title ?? '')
			setDescription(editingTask?.description ?? '')
			setIsCompleted(editingTask?.isCompleted ?? false)
			const nextStartDate = editingTask?.startDate ?? prefill?.startDate ?? null
			const nextEndDate = editingTask?.endDate ?? prefill?.endDate ?? null
			setStartDate(nextStartDate)
			setEndDate(nextEndDate)
			setDraftStartDate(nextStartDate)
			setDraftEndDate(nextEndDate)
			setDraftStartTime(toTimeInputValue(nextStartDate))
			setDraftEndTime(toTimeInputValue(nextEndDate))
			setDateTab('start')
			setDraftMonth(nextStartDate ?? new Date())

			setPriority(editingTask?.priority ?? TaskPriority.Low)
			setListId(editingTask?.listId ?? prefill?.listId ?? null)
			setIsDatePopoverOpen(false)
			setIsPriorityPopoverOpen(false)
			setIsListPopoverOpen(false)
		}
	}, [isOpen, editingTask, prefill])

	const selectedPriorityOption = useMemo(() => {
		return (
			PRIORITY_OPTIONS.find(option => option.value === priority) ??
			PRIORITY_OPTIONS[0]
		)
	}, [priority])

	const selectedList = useMemo(() => {
		if (listId === null) {
			return null
		}
		return lists.find(list => list.id === listId) ?? null
	}, [listId, lists])

	const buildTaskPayload = (): {
		trimmed: string
		nextDescription: string | null
		nextStartDate: Date | null
		nextEndDate: Date | null
	} | null => {
		const trimmed = title.trim()
		if (!trimmed) {
			if (editingTask) {
				toastMessage.showError('Название задачи не может быть пустым')
			}
			return null
		}

		const normalizedDescription = description.trim()
		const nextDescription =
			normalizedDescription.length > 0 ? normalizedDescription : null
		const nextStartDate =
			startDate && isValid(startDate) ? new Date(startDate) : null
		const nextEndDate = endDate && isValid(endDate) ? new Date(endDate) : null

		if (startDate && !nextStartDate) {
			toastMessage.showError('Некорректная дата начала')
			return null
		}
		if (endDate && !nextEndDate) {
			toastMessage.showError('Некорректная дата окончания')
			return null
		}
		if (
			nextStartDate &&
			nextEndDate &&
			nextEndDate.getTime() < nextStartDate.getTime()
		) {
			toastMessage.showError('Дата окончания не может быть раньше даты начала')
			return null
		}

		return { trimmed, nextDescription, nextStartDate, nextEndDate }
	}

	const handleDialogOpenChange = (open: boolean) => {
		if (open) {
			return
		}

		if (editingTask) {
			const payload = buildTaskPayload()
			if (payload === null) {
				return
			}

			close()

			const hasChanges =
				payload.trimmed !== editingTask.title ||
				payload.nextDescription !== (editingTask.description ?? null) ||
				isCompleted !== editingTask.isCompleted ||
				priority !== editingTask.priority ||
				listId !== (editingTask.listId ?? null) ||
				(payload.nextStartDate?.getTime() ?? null) !==
					(editingTask.startDate?.getTime() ?? null) ||
				(payload.nextEndDate?.getTime() ?? null) !==
					(editingTask.endDate?.getTime() ?? null)

			if (hasChanges) {
				void updateTask(editingTask.id, {
					title: payload.trimmed,
					description: payload.nextDescription,
					isCompleted,
					isAllDay: false,
					startDate: payload.nextStartDate,
					endDate: payload.nextEndDate,
					priority,
					listId,
				})
			}
		} else {
			close()
		}
	}

	const handleCreate = () => {
		const payload = buildTaskPayload()
		if (payload === null) {
			return
		}

		close()
		void addTask({
			title: payload.trimmed,
			description: payload.nextDescription,
			startDate: payload.nextStartDate,
			endDate: payload.nextEndDate,
			isAllDay: false,
			listId,
			priority,
		})
	}

	const handleDelete = () => {
		if (!editingTask) return
		close()
		void deleteTask(editingTask.id)
	}

	const resetDateDraft = () => {
		setDraftStartDate(startDate)
		setDraftEndDate(endDate)
		setDraftStartTime(toTimeInputValue(startDate))
		setDraftEndTime(toTimeInputValue(endDate))
		setDateTab('start')
		setDraftMonth(startDate ?? new Date())
	}

	const handleDatePopoverOpenChange = (open: boolean) => {
		setIsDatePopoverOpen(open)
		if (open) {
			resetDateDraft()
		}
	}

	const handleDateSelect = (
		tab: DateTabValue,
		selectedDate: Date | undefined,
	) => {
		if (!selectedDate) {
			if (tab === 'start') {
				setDraftStartDate(null)
			} else {
				setDraftEndDate(null)
			}
			return
		}

		const currentDate = tab === 'start' ? draftStartDate : draftEndDate
		const selectedTabTime = tab === 'start' ? draftStartTime : draftEndTime
		const currentTimeValue =
			(isCompleteTimeValue(selectedTabTime) && selectedTabTime) ||
			DEFAULT_TIME_BY_TAB[tab]
		const nextDate = applyTimeToDate(selectedDate, currentTimeValue)
		if (tab === 'start') {
			setDraftStartDate(nextDate)
			setDraftStartTime(currentTimeValue)
			return
		}
		setDraftEndDate(nextDate)
		setDraftEndTime(currentTimeValue)
	}

	const handleDraftTimeChange = (tab: DateTabValue, timeValue: string) => {
		const normalizedTime = normalizeTimeInput(timeValue)
		if (tab === 'start') {
			setDraftStartTime(normalizedTime)
			if (!isCompleteTimeValue(normalizedTime)) {
				return
			}
			setDraftStartDate(previousDate =>
				previousDate
					? applyTimeToDate(previousDate, normalizedTime)
					: previousDate,
			)
			return
		}

		setDraftEndTime(normalizedTime)
		if (!isCompleteTimeValue(normalizedTime)) {
			return
		}
		setDraftEndDate(previousDate =>
			previousDate
				? applyTimeToDate(previousDate, normalizedTime)
				: previousDate,
		)
	}

	const handleCancelDateSelection = () => {
		resetDateDraft()
		setIsDatePopoverOpen(false)
	}

	const handleSaveDateSelection = () => {
		if (
			draftStartDate &&
			draftEndDate &&
			draftEndDate.getTime() < draftStartDate.getTime()
		) {
			toastMessage.showError('Дата окончания не может быть раньше даты начала')
			return
		}

		setStartDate(draftStartDate)
		setEndDate(draftEndDate)
		setIsDatePopoverOpen(false)
	}

	const applyQuickDate = (
		preset: 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek',
	) => {
		const now = new Date()
		let nextStart: Date
		let nextEnd: Date | null = null

		if (preset === 'today') {
			nextStart = applyTimeToDate(now, DEFAULT_TIME_BY_TAB.start)
		} else if (preset === 'tomorrow') {
			nextStart = applyTimeToDate(addDays(now, 1), DEFAULT_TIME_BY_TAB.start)
		} else if (preset === 'thisWeek') {
			nextStart = applyTimeToDate(
				startOfISOWeek(now),
				DEFAULT_TIME_BY_TAB.start,
			)
			nextEnd = applyTimeToDate(endOfISOWeek(now), DEFAULT_TIME_BY_TAB.end)
		} else {
			const nextWeekStart = addDays(startOfISOWeek(now), 7)
			nextStart = applyTimeToDate(nextWeekStart, DEFAULT_TIME_BY_TAB.start)
			nextEnd = applyTimeToDate(
				endOfISOWeek(nextWeekStart),
				DEFAULT_TIME_BY_TAB.end,
			)
		}

		setDraftStartDate(nextStart)
		setDraftEndDate(nextEnd)
		setDraftStartTime(toTimeInputValue(nextStart))
		setDraftEndTime(nextEnd ? toTimeInputValue(nextEnd) : '')
		setDraftMonth(nextStart)
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
			<DialogContent className='w-[429px] max-w-[429px] gap-0 overflow-hidden p-0 sm:max-w-[429px] [&>button]:hidden'>
				<DialogHeader className='space-y-0'>
					<DialogTitle className='sr-only'>
						{editingTask ? 'Редактирование задачи' : 'Новая задача'}
					</DialogTitle>
					<div className='flex items-center justify-between border-b border-border px-6 py-3'>
						<div className='flex min-w-0 items-center gap-3'>
							<Checkbox
								id='modal-completed'
								checked={isCompleted}
								onCheckedChange={value => setIsCompleted(Boolean(value))}
								className='size-5 rounded-[4px] border border-border'
							/>
							<div className='h-5 w-px shrink-0 bg-border' />
							<Popover
								open={isDatePopoverOpen}
								onOpenChange={handleDatePopoverOpenChange}
							>
								<PopoverTrigger asChild>
									<Button
										type='button'
										variant='ghost'
										size='sm'
										className='h-8 max-w-full gap-2 px-1 text-muted-foreground hover:text-foreground ml-[-8px]'
									>
										<CalendarDays
											className='size-5 shrink-0 text-primary'
											strokeWidth={1.5}
										/>
										<span className='truncate text-[16px] text-primary'>
											{toDateRangeLabel(startDate, endDate)}
										</span>
									</Button>
								</PopoverTrigger>
								<PopoverContent
									align='start'
									collisionPadding={12}
									className='w-[260px] p-0 overflow-hidden'
								>
									{/* Tabs */}
									<div className='flex border-b border-border'>
										{(
											[
												{ value: 'start', label: 'Начало' },
												{ value: 'end', label: 'Окончание' },
											] as const
										).map(tab => (
											<button
												key={tab.value}
												type='button'
												onClick={() => {
													setDateTab(tab.value)
													setDraftMonth(
														(tab.value === 'start'
															? draftStartDate
															: draftEndDate) ??
															draftStartDate ??
															new Date(),
													)
												}}
												className={cn(
													'flex-1 py-2.5 text-sm font-medium transition-colors',
													dateTab === tab.value
														? 'border-b-2 border-primary text-foreground'
														: 'text-muted-foreground hover:text-foreground',
												)}
											>
												{tab.label}
											</button>
										))}
									</div>

									{/* Icon shortcuts */}
									<div className='flex items-center justify-center gap-4 border-b border-border px-4 py-3'>
										{(
											[
												{ key: 'today', icon: Sun, title: 'Сегодня' },
												{ key: 'tomorrow', icon: Sunrise, title: 'Завтра' },
												{
													key: 'thisWeek',
													icon: CalendarDays,
													title: 'Эта неделя',
												},
												{
													key: 'nextWeek',
													icon: CalendarRange,
													title: 'Следующая неделя',
												},
											] as const
										).map(({ key, icon: Icon, title }) => (
											<button
												key={key}
												type='button'
												title={title}
												aria-label={title}
												onClick={() => applyQuickDate(key)}
												className='flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary'
											>
												<Icon className='size-5' />
											</button>
										))}
									</div>

									{/* Calendar */}
									<div className='px-3 pt-2 pb-2'>
										<Calendar
											mode='single'
											selected={
												(dateTab === 'start' ? draftStartDate : draftEndDate) ??
												undefined
											}
											onSelect={value => handleDateSelect(dateTab, value)}
											month={draftMonth}
											onMonthChange={setDraftMonth}
											className='p-0'
										/>
									</div>

									{/* Date chip for active tab */}
									<div className='flex items-center justify-between px-4 pt-1 pb-2'>
										{(dateTab === 'start' ? draftStartDate : draftEndDate) ? (
											<span className='rounded-full bg-primary/10 px-3 py-0.5 text-sm font-medium text-primary'>
												{format(
													(dateTab === 'start'
														? draftStartDate
														: draftEndDate)!,
													'd MMMM yyyy',
													{ locale: ru },
												)}
											</span>
										) : (
											<span className='text-sm text-muted-foreground/60'>
												не выбрана
											</span>
										)}
										{(dateTab === 'start' ? draftStartDate : draftEndDate) && (
											<button
												type='button'
												onClick={() => {
													if (dateTab === 'start') {
														setDraftStartDate(null)
														setDraftStartTime('')
													} else {
														setDraftEndDate(null)
														setDraftEndTime('')
													}
												}}
												className='rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground'
												aria-label='Очистить дату'
											>
												<X className='size-3.5' />
											</button>
										)}
									</div>

									{/* Time input */}
									{(dateTab === 'start' ? draftStartDate : draftEndDate) && (
										<div className='border-t border-border px-4 py-3'>
											<div className='flex items-center gap-2'>
												<Label
													htmlFor={`task-modal-time-${dateTab}`}
													className='shrink-0 text-sm text-muted-foreground'
												>
													{dateTab === 'start'
														? 'Время начала'
														: 'Время окончания'}
												</Label>
												<Input
													id={`task-modal-time-${dateTab}`}
													type='text'
													inputMode='numeric'
													placeholder='HH:mm'
													maxLength={5}
													value={
														dateTab === 'start' ? draftStartTime : draftEndTime
													}
													onChange={event =>
														handleDraftTimeChange(dateTab, event.target.value)
													}
													className='h-8 flex-1 text-sm'
												/>
											</div>
										</div>
									)}

									{/* Footer */}
									<div className='flex items-center gap-2 border-t border-border px-4 py-2.5'>
										<Button
											type='button'
											variant='ghost'
											size='sm'
											className='flex-1'
											onClick={handleCancelDateSelection}
										>
											Отмена
										</Button>
										<Button
											type='button'
											size='sm'
											className='flex-1'
											onClick={handleSaveDateSelection}
										>
											Сохранить
										</Button>
									</div>
								</PopoverContent>
							</Popover>
						</div>

						<Popover
							open={isPriorityPopoverOpen}
							onOpenChange={setIsPriorityPopoverOpen}
						>
							<PopoverTrigger asChild>
								<Button
									type='button'
									variant='ghost'
									size='icon'
									className={cn(
										'size-9 ',
										selectedPriorityOption.colorClassName,
									)}
								>
									<Flag className='size-4' />
								</Button>
							</PopoverTrigger>
							<PopoverContent align='end' className='w-[200px] p-1'>
								<div className='flex flex-col gap-1'>
									{PRIORITY_OPTIONS.map(option => (
										<Button
											key={option.value}
											type='button'
											variant='ghost'
											className={cn(
												'w-full justify-start gap-2 h-[32px]! text-[16px]',
												priority === option.value && 'bg-accent',
											)}
											onClick={() => {
												setPriority(option.value)
												setIsPriorityPopoverOpen(false)
											}}
										>
											<Flag className={cn('size-4', option.colorClassName)} />
											{option.label}
										</Button>
									))}
								</div>
							</PopoverContent>
						</Popover>
					</div>
				</DialogHeader>

				<div className='space-y-2 px-6 py-5'>
					<Input
						id='modal-title'
						placeholder='Название задачи'
						value={title}
						onChange={event => setTitle(event.target.value)}
								className='h-auto border-0 bg-transparent! p-0 text-[18px]! leading-[1.05] font-bold shadow-none focus-visible:ring-0'
						autoFocus
					/>
					<Textarea
						id='modal-description'
						placeholder='Описание задачи'
						value={description}
						onChange={event => setDescription(event.target.value)}
							className='min-h-[80px] resize-none border-0 bg-transparent! p-0 text-[18px]! shadow-none focus-visible:ring-0'
					/>
				</div>

				<div className='px-6 py-3'>
					<div className='flex flex-wrap items-center justify-between gap-3'>
						<Popover
							open={isListPopoverOpen}
							onOpenChange={setIsListPopoverOpen}
						>
							<PopoverTrigger asChild>
								<Button
									type='button'
									variant='ghost'
									className='h-9 max-w-[260px] justify-start gap-2 px-2 text-muted-foreground hover:text-foreground'
								>
									{selectedList ? (
										<span
											className='h-[22px] w-[22px] shrink-0 rounded-[4px]'
											style={{ backgroundColor: selectedList.colorHex }}
										/>
									) : (
										<Inbox className='size-[18px] shrink-0' />
									)}
									<span className='truncate text-sm'>
										{selectedList ? selectedList.name : 'Входящие'}
									</span>
								</Button>
							</PopoverTrigger>
							<PopoverContent align='start' className='w-[260px] p-1'>
								<div
									className={cn(
										'flex flex-col gap-1',
										lists.length > LISTS_WITH_SCROLL_COUNT &&
											'max-h-56 overflow-y-auto pr-1',
									)}
								>
									<Button
										type='button'
										variant='ghost'
										className={cn(
											'w-full justify-start gap-3 px-2 h-[32px]! text-[16px]',
											listId === null && 'bg-accent',
										)}
										onClick={() => {
											setListId(null)
											setIsListPopoverOpen(false)
										}}
									>
										<Inbox className='size-[18px] shrink-0 text-muted-foreground' />
										Входящие
									</Button>
									{lists.map(list => (
										<Button
											key={list.id}
											type='button'
											variant='ghost'
											className={cn(
												'w-full justify-start gap-3 px-2 text-[16px] h-[32px]!',
												listId === list.id && 'bg-accent',
											)}
											onClick={() => {
												setListId(list.id)
												setIsListPopoverOpen(false)
											}}
										>
											<span
												className='h-[22px] w-[22px] shrink-0 rounded-[4px]'
												style={{ backgroundColor: list.colorHex }}
											/>
											<span className='truncate'>{list.name}</span>
										</Button>
									))}
								</div>
							</PopoverContent>
						</Popover>

						<div className='flex items-center gap-2'>
							{isEditMode && (
								<Button
									type='button'
									variant='ghost'
									size='icon'
									className='text-destructive hover:text-destructive'
									onClick={handleDelete}
								>
									<Trash2 className='size-4' />
								</Button>
							)}
							{isEditMode ? (
								<Button type='button' size='sm' onClick={() => handleDialogOpenChange(false)}>
									Сохранить
								</Button>
							) : (
								<Button type='button' size='sm' onClick={handleCreate}>
									Создать
								</Button>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

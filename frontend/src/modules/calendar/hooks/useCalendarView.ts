import { useTaskModal } from '@modules/tasks/store/task-modal.store'
import { useTasksStore } from '@modules/tasks/store/tasks.store'
import { useListsStore } from '@modules/lists/store/lists.store'
import { ru } from 'date-fns/locale'
import {
	addDays,
	addMonths,
	addWeeks,
	format,
	subDays,
	subMonths,
	subWeeks,
} from 'date-fns'
import { useCallback, useMemo, useState } from 'react'
import { Views } from 'react-big-calendar'
import type { View } from 'react-big-calendar'
import { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'
import { CalendarTaskEvent } from '../components/BigCalendar'
import { deriveAllDay } from '../utils/calendar.utils'

const MIN_EVENT_DURATION_MS = 15 * 60 * 1000

export function useCalendarView(view: View) {
	const [date, setDate] = useState(new Date())
	const tasks = useTasksStore(s => s.tasks)
	const updateTask = useTasksStore(s => s.updateTask)
	const deleteTask = useTasksStore(s => s.deleteTask)
	const lists = useListsStore(s => s.lists)
	const { openNew, openEdit } = useTaskModal()

	const monthLabel =
		view === Views.DAY
			? format(date, 'd MMMM', { locale: ru })
			: format(date, 'LLLL yyyy', { locale: ru })

	const handleNavigate = useCallback((newDate: Date) => {
		setDate(newDate)
	}, [])

	const handlePrevious = useCallback(() => {
		setDate(prev => {
			if (view === Views.DAY) return subDays(prev, 1)
			if (view === Views.WEEK) return subWeeks(prev, 1)
			return subMonths(prev, 1)
		})
	}, [view])

	const handleNext = useCallback(() => {
		setDate(prev => {
			if (view === Views.DAY) return addDays(prev, 1)
			if (view === Views.WEEK) return addWeeks(prev, 1)
			return addMonths(prev, 1)
		})
	}, [view])

	const handleAddTask = useCallback(() => {
		openNew({
			startDate: new Date(),
			endDate: new Date(Date.now() + 60 * 60 * 1000),
		})
	}, [openNew])

	const events = useMemo<CalendarTaskEvent[]>(
		() =>
			tasks
				.filter(t => t.startDate !== null && (t.endDate !== null || t.isAllDay))
				.map(t => {
					const list =
						t.listId !== null ? lists.find(l => l.id === t.listId) : undefined
					const rawEnd =
						t.endDate ?? new Date(t.startDate!.getTime() + 24 * 60 * 60 * 1000)
					// All-day: use short duration so RBC doesn't span 2 days
					// and drag preview into the time grid shows a 1 h block instead of 24 h.
					// In the all-day header row RBC always renders full-width regardless of duration.
					const displayEnd = t.isAllDay
						? new Date(t.startDate!.getTime() + 60 * 60 * 1000)
						: rawEnd
					return {
						resource: t,
						title: t.title,
						start: t.startDate!,
						end: displayEnd,
						allDay: t.isAllDay,
						colorHex: list?.colorHex,
					}
				}),
		[tasks, lists],
	)

	const handleSelectSlot = useCallback(
		(start: Date, end: Date) => {
			openNew({ startDate: start, endDate: end })
		},
		[openNew],
	)

	const handleSelectEvent = useCallback(
		(event: CalendarTaskEvent) => {
			openEdit(event.resource)
		},
		[openEdit],
	)

	const handleEventDrop = useCallback(
		({
			event,
			start,
			end,
			isAllDay: droppedAsAllDay,
		}: EventInteractionArgs<CalendarTaskEvent>) => {
			if (!start || !end || isNaN(new Date(start).getTime())) return

			const nextStart = new Date(start)
			const nextAllDay = deriveAllDay(
				nextStart,
				new Date(end),
				droppedAsAllDay,
				event.allDay,
			)

			let nextEnd: Date
			if (nextAllDay) {
				// Dropped into all-day row — always full 24 h boundary
				nextEnd = new Date(nextStart.getTime() + 24 * 60 * 60 * 1000)
			} else if (
				event.allDay ||
				new Date(end).getTime() - nextStart.getTime() > 24 * 60 * 60 * 1000
			) {
				// Was all-day or multi-day, dropped onto a time slot — default 1 h duration
				nextEnd = new Date(nextStart.getTime() + 60 * 60 * 1000)
			} else {
				// Regular timed drag — RBC preserves the original duration in `end`
				nextEnd = new Date(end)
			}

			updateTask(event.resource.id, {
				startDate: nextStart,
				endDate: nextEnd,
				isAllDay: nextAllDay,
			})
		},
		[updateTask],
	)

	const handleEventResize = useCallback(
		({
			event,
			start,
			end,
			isAllDay,
		}: EventInteractionArgs<CalendarTaskEvent>) => {
			const nextStart = new Date(start)
			const nextEnd = new Date(end)

			if (nextEnd.getTime() - nextStart.getTime() < MIN_EVENT_DURATION_MS)
				return

			const nextAllDay = deriveAllDay(
				nextStart,
				nextEnd,
				isAllDay,
				event.allDay,
			)

			updateTask(event.resource.id, {
				startDate: nextStart,
				endDate: nextEnd,
				isAllDay: nextAllDay,
			})
		},
		[updateTask],
	)

	const handleDeleteEvent = useCallback(
		(event: CalendarTaskEvent) => {
			void deleteTask(event.resource.id)
		},
		[deleteTask],
	)

	return {
		date,
		events,
		monthLabel,
		handleNavigate,
		handlePrevious,
		handleNext,
		handleSelectSlot,
		handleSelectEvent,
		handleEventDrop,
		handleEventResize,
		handleDeleteEvent,
		handleAddTask,
	}
}

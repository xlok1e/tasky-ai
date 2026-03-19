import { useTaskModal } from "@modules/tasks/store/task-modal.store";
import { useTasksStore } from "@modules/tasks/store/tasks.store";
import { ru } from "date-fns/locale";
import { addDays, addMonths, addWeeks, format, subDays, subMonths, subWeeks } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { Views } from "react-big-calendar";
import type { View } from "react-big-calendar";
import { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { CalendarTaskEvent } from "../components/BigCalendar";
import { deriveAllDay, clampToSingleDay } from "../utils/calendar.utils";

export function useCalendarView(view: View) {
	const [date, setDate] = useState(new Date());
	const tasks = useTasksStore((s) => s.tasks);
	const updateTask = useTasksStore((s) => s.updateTask);
	const { openNew, openEdit } = useTaskModal();

	const monthLabel = format(date, "LLLL yyyy", { locale: ru });

	const handleNavigate = useCallback((newDate: Date) => {
		setDate(newDate);
	}, []);

	const handlePrevious = useCallback(() => {
		setDate((prev) => {
			if (view === Views.DAY) return subDays(prev, 1);
			if (view === Views.WEEK) return subWeeks(prev, 1);
			return subMonths(prev, 1);
		});
	}, [view]);

	const handleNext = useCallback(() => {
		setDate((prev) => {
			if (view === Views.DAY) return addDays(prev, 1);
			if (view === Views.WEEK) return addWeeks(prev, 1);
			return addMonths(prev, 1);
		});
	}, [view]);

	const handleAddTask = useCallback(() => {
		openNew({
			startDate: new Date(),
			endDate: new Date(Date.now() + 60 * 60 * 1000),
		});
	}, [openNew]);

	const events = useMemo<CalendarTaskEvent[]>(
		() =>
			tasks
				.filter((t) => t.startDate !== null && t.endDate !== null)
				.map((t) => ({
					resource: t,
					title: t.title,
					start: t.startDate!,
					end: t.endDate!,
					allDay: t.isAllDay,
				})),
		[tasks],
	);

	const handleSelectSlot = useCallback(
		(start: Date, end: Date) => {
			openNew({ startDate: start, endDate: end });
		},
		[openNew],
	);

	const handleSelectEvent = useCallback(
		(event: CalendarTaskEvent) => {
			openEdit(event.resource);
		},
		[openEdit],
	);

	const handleEventDrop = useCallback(
		({ event, start, end, isAllDay }: EventInteractionArgs<CalendarTaskEvent>) => {
			const nextStart = new Date(start);
			const nextEnd = new Date(end);
			const nextAllDay = deriveAllDay(nextStart, nextEnd, isAllDay, event.allDay);
			const normalizedEnd =
				!nextAllDay &&
				event.allDay &&
				event.end.getTime() - event.start.getTime() >= 24 * 60 * 60 * 1000
					? clampToSingleDay(nextStart)
					: nextEnd;

			updateTask(event.resource.id, {
				startDate: nextStart,
				endDate: normalizedEnd,
				isAllDay: nextAllDay,
			});
		},
		[updateTask],
	);

	const handleEventResize = useCallback(
		({ event, start, end, isAllDay }: EventInteractionArgs<CalendarTaskEvent>) => {
			const nextStart = new Date(start);
			const nextEnd = new Date(end);
			const nextAllDay = deriveAllDay(nextStart, nextEnd, isAllDay, event.allDay);

			updateTask(event.resource.id, {
				startDate: nextStart,
				endDate: nextEnd,
				isAllDay: nextAllDay,
			});
		},
		[updateTask],
	);

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
		handleAddTask,
	};
}

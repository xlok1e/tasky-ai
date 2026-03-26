"use client";

import { useCallback, useMemo, useEffect, useRef, ComponentType } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./big-calendar.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock } from "lucide-react";
import type { CalendarProps } from "react-big-calendar";
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import type { Task } from "@modules/tasks/types/task.types";
import { getContrastColor, hexToRgba } from "@modules/calendar/utils/calendar.utils";

import type { View } from "react-big-calendar";

const locales = { ru };

const localizer = dateFnsLocalizer({
	format,
	parse,
	startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
	getDay,
	locales,
});

export interface CalendarTaskEvent {
	resource: Task;
	title: string;
	start: Date;
	end: Date;
	allDay?: boolean;
	colorHex?: string;
}

const DnDCalendar = withDragAndDrop<CalendarTaskEvent>(
	Calendar as ComponentType<CalendarProps<CalendarTaskEvent>>,
);

const MESSAGES = {
	week: "Неделя",
	day: "День",
	month: "Месяц",
	agenda: "Список",
	today: "Сегодня",
	previous: "←",
	next: "→",
	noEventsInRange: "Нет задач",
	showMore: (count: number) => `+${count} ещё`,
};

interface CalendarEventProps {
	event: CalendarTaskEvent;
}

function CalendarEventContent({ event }: CalendarEventProps) {
	const task = event.resource;
	const durationMs = event.end.getTime() - event.start.getTime();
	const isTall = durationMs >= 45 * 60 * 1000; // 45 min ≈ 60px (80px/hour from CSS)
	const timeStr =
		!event.allDay && isTall
			? `${format(event.start, "HH:mm")} — ${format(event.end, "HH:mm")}`
			: null;

	return (
		<div className="calendar-event-inner">
			<p className="calendar-event-title">{task.title}</p>
			{timeStr && (
				<div className="calendar-event-time">
					<Clock size={10} strokeWidth={2} className="shrink-0" />
					<span>{timeStr}</span>
				</div>
			)}
		</div>
	);
}

interface BigCalendarProps {
	events: CalendarTaskEvent[];
	date: Date;
	view: View;
	onNavigate: (date: Date) => void;
	onSelectSlot: (start: Date, end: Date) => void;
	onSelectEvent: (event: CalendarTaskEvent) => void;
	onEventDrop: (args: EventInteractionArgs<CalendarTaskEvent>) => void;
	onEventResize: (args: EventInteractionArgs<CalendarTaskEvent>) => void;
}

export function BigCalendar({
	events,
	date,
	view,
	onNavigate,
	onSelectSlot,
	onSelectEvent,
	onEventDrop,
	onEventResize,
}: BigCalendarProps) {
	const calendarRef = useRef<HTMLDivElement>(null);
	const scrollLockRef = useRef<{
		locked: boolean;
		savedScrollTop: number;
		timeContent: HTMLElement | null;
		scrollHandler: (() => void) | null;
		mouseUpHandler: (() => void) | null;
	}>({
		locked: false,
		savedScrollTop: 0,
		timeContent: null,
		scrollHandler: null,
		mouseUpHandler: null,
	});

	const unlockScroll = useCallback(() => {
		const lock = scrollLockRef.current;
		if (!lock.locked) return;

		if (lock.timeContent && lock.scrollHandler) {
			lock.timeContent.removeEventListener("scroll", lock.scrollHandler);
		}
		if (lock.mouseUpHandler) {
			document.removeEventListener("mouseup", lock.mouseUpHandler);
			document.removeEventListener("touchend", lock.mouseUpHandler);
		}

		lock.locked = false;
		lock.scrollHandler = null;
		lock.mouseUpHandler = null;
		lock.timeContent = null;
	}, []);

	const lockScroll = useCallback(() => {
		const container = calendarRef.current;
		if (!container) return;

		const timeContent = container.querySelector<HTMLElement>(".rbc-time-content");
		if (!timeContent) return;

		const lock = scrollLockRef.current;
		lock.locked = true;
		lock.savedScrollTop = timeContent.scrollTop;
		lock.timeContent = timeContent;

		const scrollHandler = () => {
			if (lock.locked && lock.timeContent) {
				lock.timeContent.scrollTop = lock.savedScrollTop;
			}
		};
		lock.scrollHandler = scrollHandler;
		timeContent.addEventListener("scroll", scrollHandler);

		const mouseUpHandler = () => {
			// Delay unlock slightly so any final scroll events are still caught
			setTimeout(() => unlockScroll(), 50);
		};
		lock.mouseUpHandler = mouseUpHandler;
		document.addEventListener("mouseup", mouseUpHandler);
		document.addEventListener("touchend", mouseUpHandler);
	}, [unlockScroll]);

	// Cleanup on unmount
	useEffect(() => {
		return () => unlockScroll();
	}, [unlockScroll]);

	const handleDragStart = useCallback(
		({ event }: { event: CalendarTaskEvent; action: string; direction: string }) => {
			if (event.allDay) {
				lockScroll();
			}
		},
		[lockScroll],
	);

	const handleEventDrop = useCallback(
		(args: EventInteractionArgs<CalendarTaskEvent>) => {
			unlockScroll();
			onEventDrop(args);
		},
		[onEventDrop, unlockScroll],
	);

	const handleEventResize = useCallback(
		(args: EventInteractionArgs<CalendarTaskEvent>) => {
			unlockScroll();
			onEventResize(args);
		},
		[onEventResize, unlockScroll],
	);

	const eventPropGetter = useCallback<
		NonNullable<CalendarProps<CalendarTaskEvent>["eventPropGetter"]>
	>((event) => {
		const style: React.CSSProperties & Record<string, string> = {};
		const colorHex = event.colorHex;

		if (colorHex) {
			style.backgroundColor = hexToRgba(colorHex, 0.5);
			style.color = getContrastColor(colorHex);
		} else {
			style.backgroundColor = hexToRgba("#809671", 0.7);
			style.color = getContrastColor("#809671");
		}

		const durationMs = event.end.getTime() - event.start.getTime();
		const isCompact = durationMs <= 15 * 60 * 1000;

		const className = [
			event.resource.isCompleted ? "event-completed" : "event-variant-primary",
			isCompact ? "event-compact" : null,
		]
			.filter(Boolean)
			.join(" ");

		return { style, className };
	}, []);

	const components = useMemo<CalendarProps<CalendarTaskEvent>["components"]>(
		() => ({
			week: {
				header: ({ date: headerDate }: { date: Date }) => (
					<div className="flex flex-col items-center py-1">
						<span>{format(headerDate, "EEEEEE", { locale: ru })}</span>
						<span>{format(headerDate, "d")}</span>
					</div>
				),
			},
			event: CalendarEventContent,
		}),
		[],
	);

	return (
		<div ref={calendarRef} style={{ height: "100%", width: "100%" }}>
			<DnDCalendar
				localizer={localizer}
				culture="ru"
				messages={MESSAGES}
				style={{ height: "100%", width: "100%" }}
				className="border border-border rounded-lg"
				defaultView={Views.WEEK}
				view={view}
				onView={() => {}}
				date={date}
				onNavigate={onNavigate}
				events={events}
				selectable
				resizable
				draggableAccessor={() => true}
				resizableAccessor={(event) => !event.allDay}
				eventPropGetter={eventPropGetter}
				onSelectSlot={(slot) => onSelectSlot(slot.start, slot.end)}
				onSelectEvent={onSelectEvent}
				onEventDrop={handleEventDrop}
				onEventResize={handleEventResize}
				onDragStart={handleDragStart}
				toolbar={false}
				step={5}
				timeslots={12}
				components={components}
			/>
		</div>
	);
}

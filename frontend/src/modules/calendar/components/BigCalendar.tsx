"use client";

import { useCallback, useMemo, ComponentType } from "react";
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
	const timeStr = !event.allDay
		? `${format(event.start, "HH:mm")} — ${format(event.end, "HH:mm")}`
		: null;

	return (
		<div className="calendar-event-inner">
			<p className="calendar-event-title">{task.title}</p>
			{timeStr && (
				<div className="calendar-event-time">
					<Clock size={10} strokeWidth={2} />
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
	const eventPropGetter = useCallback<
		NonNullable<CalendarProps<CalendarTaskEvent>["eventPropGetter"]>
	>((event) => {
		const style: React.CSSProperties & Record<string, string> = {};
		const colorHex = event.colorHex;

		if (colorHex) {
			style.backgroundColor = hexToRgba(colorHex, 0.5);
			style.color = getContrastColor(colorHex);
		}

		const className = event.resource.isCompleted ? "event-completed" : "event-variant-primary";
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
		<DnDCalendar
			localizer={localizer}
			culture="ru"
			messages={MESSAGES}
			style={{ height: 900, width: "100%" }}
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
			resizableAccessor={() => true}
			eventPropGetter={eventPropGetter}
			onSelectSlot={(slot) => onSelectSlot(slot.start, slot.end)}
			onSelectEvent={onSelectEvent}
			onEventDrop={onEventDrop}
			onEventResize={onEventResize}
			toolbar={false}
			step={15}
			timeslots={4}
			components={components}
		/>
	);
}

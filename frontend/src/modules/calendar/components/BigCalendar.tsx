"use client";

import { useMemo, ComponentType } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./big-calendar.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ru } from "date-fns/locale";
import type { CalendarProps } from "react-big-calendar";
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import type { Task } from "@modules/tasks/types/task.types";

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
}

const DnDCalendar = withDragAndDrop<CalendarTaskEvent>(
  Calendar as ComponentType<CalendarProps<CalendarTaskEvent>>
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

interface BigCalendarProps {
  events: CalendarTaskEvent[];
  date: Date;
  onNavigate: (date: Date) => void;
  onSelectSlot: (start: Date, end: Date) => void;
  onSelectEvent: (event: CalendarTaskEvent) => void;
  onEventDrop: (args: EventInteractionArgs<CalendarTaskEvent>) => void;
  onEventResize: (args: EventInteractionArgs<CalendarTaskEvent>) => void;
}

export function BigCalendar({
  events,
  date,
  onNavigate,
  onSelectSlot,
  onSelectEvent,
  onEventDrop,
  onEventResize,
}: BigCalendarProps) {
  const eventPropGetter = useMemo<CalendarProps<CalendarTaskEvent>["eventPropGetter"]>(
    () => (event) => ({
      className: event.resource.isCompleted
        ? "event-variant-outline"
        : "event-variant-primary",
    }),
    []
  );

  return (
    <DnDCalendar
      localizer={localizer}
      culture="ru"
      messages={MESSAGES}
      style={{ height: 700, width: "100%" }}
      className="border border-border rounded-lg"
      defaultView={Views.WEEK}
      view={Views.WEEK}
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
    />
  );
}

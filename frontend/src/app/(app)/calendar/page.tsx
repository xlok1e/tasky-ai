"use client";

import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus } from "lucide-react";
import { Button } from "ui/button";
import { BigCalendar, CalendarTaskEvent } from "@components/calendar/BigCalendar";
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { useTasksStore } from "@modules/tasks/store/tasks.store";
import { useTaskModal } from "@modules/tasks/store/task-modal.store";

function deriveAllDay(
  startDate: Date,
  endDate: Date,
  isAllDay?: boolean,
  fallback?: boolean
): boolean {
  if (typeof isAllDay === "boolean") return isAllDay;
  const dayDiff = endDate.getTime() - startDate.getTime();
  const startsAtMidnight =
    startDate.getHours() === 0 && startDate.getMinutes() === 0 && startDate.getSeconds() === 0;
  const endsAtMidnight =
    endDate.getHours() === 0 && endDate.getMinutes() === 0 && endDate.getSeconds() === 0;
  if (startsAtMidnight && endsAtMidnight && dayDiff >= 24 * 60 * 60 * 1000) return true;
  if (!startsAtMidnight || dayDiff < 24 * 60 * 60 * 1000) return false;
  return fallback ?? false;
}

function clampToSingleDay(startDate: Date): Date {
  const end = new Date(startDate);
  end.setHours(23, 59, 59, 999);
  return end;
}

export default function CalendarPage() {
  const [date, setDate] = useState(new Date());
  const tasks = useTasksStore((s) => s.tasks);
  const updateTask = useTasksStore((s) => s.updateTask);
  const { openNew, openEdit } = useTaskModal();

  const monthLabel = format(date, "LLLL yyyy", { locale: ru });

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
    [tasks]
  );

  const handleSelectSlot = useCallback(
    (start: Date, end: Date) => {
      openNew({ startDate: start, endDate: end });
    },
    [openNew]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarTaskEvent) => {
      openEdit(event.resource);
    },
    [openEdit]
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
    [updateTask]
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
    [updateTask]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold capitalize">{monthLabel}</h1>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() =>
            openNew({
              startDate: new Date(),
              endDate: new Date(Date.now() + 60 * 60 * 1000),
            })
          }
        >
          <Plus size={16} />
          Добавить задачу
        </Button>
      </div>

      <BigCalendar
        events={events}
        date={date}
        onNavigate={setDate}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
      />
    </div>
  );
}

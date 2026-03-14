"use client";

import { Plus } from "lucide-react";
import { Button } from "@shared/ui/button";
import { BigCalendar } from "@modules/calendar/components/BigCalendar";
import { useCalendarView } from "../hooks/useCalendarView";

export function CalendarView() {
	const {
		date,
		setDate,
		events,
		monthLabel,
		handleSelectSlot,
		handleSelectEvent,
		handleEventDrop,
		handleEventResize,
		handleAddTask,
	} = useCalendarView();

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold capitalize">{monthLabel}</h1>
				<Button variant="outline" className="gap-2" onClick={handleAddTask}>
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

export default CalendarView;

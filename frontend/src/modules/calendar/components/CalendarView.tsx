"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Sparkles } from "lucide-react";
import { Views } from "react-big-calendar";
import type { View } from "react-big-calendar";
import { Button } from "@shared/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@shared/ui/tabs";
import { BigCalendar } from "@modules/calendar/components/BigCalendar";
import { useCalendarView } from "../hooks/useCalendarView";

export function CalendarView() {
	const [view, setView] = useState<View>(Views.WEEK);

	const {
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
	} = useCalendarView(view);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between">
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-1">
						<Button variant="ghost" className="w-[40px]! h-[40px]!" onClick={handlePrevious}>
							<ArrowLeft className="size-[24px]" strokeWidth={2} />
						</Button>
						<h1 className="text-2xl font-semibold capitalize min-w-[165px] text-center">
							{monthLabel}
						</h1>
						<Button variant="ghost" className="w-[40px]! h-[40px]!" onClick={handleNext}>
							<ArrowRight className="size-[24px]" strokeWidth={2} />
						</Button>
					</div>
					<Button variant="secondary" className="w-fit" onClick={handleAddTask}>
						Добавить задачу
					</Button>
				</div>

				<div className="flex items-center gap-3">
					<Tabs value={view} onValueChange={(v) => setView(v as View)}>
						<TabsList>
							<TabsTrigger value={Views.DAY}>День</TabsTrigger>
							<TabsTrigger value={Views.WEEK}>Неделя</TabsTrigger>
							<TabsTrigger value={Views.MONTH}>Месяц</TabsTrigger>
						</TabsList>
					</Tabs>
					<Button variant="outline" className="gap-2">
						<Sparkles size={16} />
						ИИ-ассистент
					</Button>
				</div>
			</div>

			<BigCalendar
				events={events}
				date={date}
				view={view}
				onNavigate={handleNavigate}
				onSelectSlot={handleSelectSlot}
				onSelectEvent={handleSelectEvent}
				onEventDrop={handleEventDrop}
				onEventResize={handleEventResize}
			/>
		</div>
	);
}

export default CalendarView;

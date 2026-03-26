import { TaskResponse } from "../types/task.api.types";
import { TaskStatus } from "../types/task.enums";
import { Task } from "../types/task.types";
import { format } from "date-fns";

export function getTaskDate(task: Task) {
	return task.deadline ?? task.endDate ?? task.startDate;
}

export function formatTaskDate(task: Task) {
	const date = getTaskDate(task);
	return date ? format(date, "dd.MM.yyyy") : "";
}

function deriveIsAllDay(startAt: string | null, endAt: string | null): boolean {
	if (!startAt || !endAt) return false;
	const start = new Date(startAt);
	const end = new Date(endAt);
	return (
		start.getHours() === 0 &&
		start.getMinutes() === 0 &&
		start.getSeconds() === 0 &&
		end.getHours() === 0 &&
		end.getMinutes() === 0 &&
		end.getSeconds() === 0 &&
		end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000
	);
}

export function mapTaskResponseToTask(r: TaskResponse): Task {
	return {
		id: r.id,
		listId: r.listId,
		title: r.title,
		description: r.description,
		isCompleted: r.status === TaskStatus.Completed,
		isAllDay: deriveIsAllDay(r.startAt, r.endAt),
		startDate: r.startAt ? new Date(r.startAt) : null,
		endDate: r.endAt ? new Date(r.endAt) : null,
		deadline: r.deadline ? new Date(r.deadline) : null,
		priority: r.priority,
	};
}

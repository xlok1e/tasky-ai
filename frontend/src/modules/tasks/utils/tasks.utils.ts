import { TaskResponse } from '../types/task.api.types'
import { TaskStatus } from '../types/task.enums'
import { Task } from '../types/task.types'
import { format } from 'date-fns'

export function getTaskDate(task: Task) {
	return task.deadline ?? task.endDate ?? task.startDate
}

export function formatTaskDate(task: Task) {
	const date = getTaskDate(task)
	return date ? format(date, 'dd.MM.yyyy') : ''
}

export function mapTaskResponseToTask(r: TaskResponse): Task {
	return {
		id: r.id,
		listId: r.listId,
		title: r.title,
		description: r.description,
		isCompleted: r.status === TaskStatus.Completed,
		isAllDay: r.isAllDay,
		startDate: r.startAt ? new Date(r.startAt) : null,
		endDate: r.endAt ? new Date(r.endAt) : null,
		deadline: r.deadline ? new Date(r.deadline) : null,
		priority: r.priority,
		notifyAt: r.notifyAt ? new Date(r.notifyAt) : null,
	}
}

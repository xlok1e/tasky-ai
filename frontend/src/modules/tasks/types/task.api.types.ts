import { TaskPriority, TaskStatus } from './task.enums'

/** Shape returned by the backend */
export interface TaskResponse {
	id: number
	userId: number
	listId: number | null
	listName: string | null
	title: string
	description: string | null
	startAt: string | null
	endAt: string | null
	isAllDay: boolean
	deadline: string | null
	priority: TaskPriority
	status: TaskStatus
	createdAt: string
	completedAt: string | null
	googleEventId: string | null
	notifyAt: string | null
}

export interface CreateTaskRequest {
	title: string
	description?: string | null
	startAt?: string | null
	endAt?: string | null
	deadline?: string | null
	priority: TaskPriority
	listId?: number | null
	notifyAt?: string | null
}

export interface UpdateTaskRequest {
	title: string
	description?: string | null
	startAt?: string | null
	endAt?: string | null
	deadline?: string | null
	priority: TaskPriority
	status: TaskStatus
	listId?: number | null
	notifyAt?: string | null
}

export enum TaskPriority {
	Low = 0,
	Medium = 1,
	High = 2,
}

export enum TaskStatus {
	InProgress = 0,
	Completed = 1,
}

/** Shape returned by the backend */
export interface TaskResponse {
	id: number;
	userId: number;
	listId: number | null;
	listName: string | null;
	title: string;
	description: string | null;
	startAt: string | null;
	endAt: string | null;
	deadline: string | null;
	isAllDay: boolean;
	priority: TaskPriority;
	status: TaskStatus;
	createdAt: string;
	completedAt: string | null;
	googleEventId: string | null;
}

export interface CreateTaskRequest {
	title: string;
	description?: string | null;
	startAt?: string | null;
	endAt?: string | null;
	deadline?: string | null;
	priority: TaskPriority;
	listId?: number | null;
}

export interface UpdateTaskRequest {
	title: string;
	description?: string | null;
	startAt?: string | null;
	endAt?: string | null;
	deadline?: string | null;
	isAllDay: boolean;
	priority: TaskPriority;
	status: TaskStatus;
	listId?: number | null;
}

/** Client-side task representation */
export interface Task {
	id: number;
	listId: number | null;
	title: string;
	description: string | null;
	isCompleted: boolean;
	isAllDay: boolean;
	startDate: Date | null;
	endDate: Date | null;
	deadline: Date | null;
	priority: TaskPriority;
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
	};
}

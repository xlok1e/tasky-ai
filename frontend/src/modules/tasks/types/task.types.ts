import { TaskPriority } from "./task.enums";

export interface Task {
	id: number;
	listId: number | null;
	title: string;
	description: string | null;
	isCompleted: boolean;
	isAllDay: boolean;
	startDate: Date | null;
	endDate: Date | null;
	priority: TaskPriority;
}

export interface AddTaskParams {
	title: string;
	startDate?: Date | null;
	endDate?: Date | null;
	deadline?: Date | null;
	isAllDay?: boolean;
	listId?: number | null;
	priority?: TaskPriority;
}

export interface TaskListSectionProps {
	title: string;
	tasks: Task[];
}

export interface TaskListProps {
	listId?: number;
	tasks?: Task[];
	isLoading?: boolean;
	error?: string | null;
}

export interface TaskRowProps {
	task: Task;
}

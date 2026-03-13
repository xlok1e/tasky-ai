import { create } from "zustand";
import {
	fetchTasks as apiFetchTasks,
	createTask as apiCreateTask,
	updateTask as apiUpdateTask,
	deleteTask as apiDeleteTask,
} from "@shared/api/tasks.api";
import { mapTaskResponseToTask, TaskPriority, TaskStatus } from "../types/task.types";
import type { Task, CreateTaskRequest, UpdateTaskRequest } from "../types/task.types";

interface TasksState {
	tasks: Task[];
	isLoading: boolean;
	error: string | null;

	fetchTasks: () => Promise<void>;
	addTask: (
		title: string,
		dueDate: Date | null,
		startDate?: Date | null,
		endDate?: Date | null,
		isAllDay?: boolean,
	) => Promise<void>;
	toggleTask: (task: Task) => Promise<void>;
	updateTask: (
		id: number,
		patch: Partial<
			Pick<
				Task,
				"title" | "description" | "dueDate" | "isCompleted" | "startDate" | "endDate" | "isAllDay"
			>
		>,
	) => Promise<void>;
	deleteTask: (id: number) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
	tasks: [],
	isLoading: false,
	error: null,

	fetchTasks: async () => {
		set({ isLoading: true, error: null });
		try {
			const data = await apiFetchTasks();
			set({ tasks: data.map(mapTaskResponseToTask), isLoading: false });
		} catch {
			set({ isLoading: false, error: "Не удалось загрузить задачи" });
		}
	},

	addTask: async (title, dueDate, startDate = null, endDate = null, isAllDay = false) => {
		const request: CreateTaskRequest = {
			title: title.trim(),
			deadline: dueDate ? dueDate.toISOString() : null,
			startAt: startDate ? startDate.toISOString() : null,
			endAt: endDate ? endDate.toISOString() : null,
			priority: TaskPriority.Low,
		};
		const created = await apiCreateTask(request);
		const task = mapTaskResponseToTask(created);
		if (isAllDay && !task.isAllDay) {
			task.isAllDay = true;
		}
		set((state) => ({ tasks: [task, ...state.tasks] }));
	},

	toggleTask: async (task: Task) => {
		set((state) => ({
			tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t)),
		}));

		const request: UpdateTaskRequest = {
			title: task.title,
			description: task.description,
			startAt: task.startDate ? task.startDate.toISOString() : null,
			endAt: task.endDate ? task.endDate.toISOString() : null,
			deadline: task.dueDate ? task.dueDate.toISOString() : null,
			priority: task.priority,
			status: task.isCompleted ? TaskStatus.InProgress : TaskStatus.Completed,
		};

		try {
			const updated = await apiUpdateTask(task.id, request);
			const updatedTask = mapTaskResponseToTask(updated);
			set((state) => ({
				tasks: state.tasks.map((t) => (t.id === task.id ? updatedTask : t)),
			}));
		} catch {
			set((state) => ({
				tasks: state.tasks.map((t) =>
					t.id === task.id ? { ...t, isCompleted: task.isCompleted } : t,
				),
			}));
		}
	},

	updateTask: async (id, patch) => {
		const current = get().tasks.find((t) => t.id === id);
		if (!current) return;

		const merged: Task = { ...current, ...patch };

		const request: UpdateTaskRequest = {
			title: merged.title,
			description: merged.description,
			startAt: merged.startDate ? merged.startDate.toISOString() : null,
			endAt: merged.endDate ? merged.endDate.toISOString() : null,
			deadline: merged.dueDate ? merged.dueDate.toISOString() : null,
			priority: merged.priority,
			status: merged.isCompleted ? TaskStatus.Completed : TaskStatus.InProgress,
		};

		const updated = await apiUpdateTask(id, request);
		const updatedTask = mapTaskResponseToTask(updated);
		if (patch.isAllDay !== undefined) {
			updatedTask.isAllDay = patch.isAllDay;
		}
		set((state) => ({
			tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
		}));
	},

	deleteTask: async (id) => {
		await apiDeleteTask(id);
		set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
	},
}));

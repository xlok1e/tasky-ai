import { create } from "zustand";
import {
	fetchTasks as apiFetchTasks,
	createTask as apiCreateTask,
	updateTask as apiUpdateTask,
	deleteTask as apiDeleteTask,
} from "../api/tasks.api";
import { mapTaskResponseToTask, TaskPriority, TaskStatus } from "../types/task.types";
import type { Task, CreateTaskRequest, UpdateTaskRequest } from "../types/task.types";
import { toastMessage } from "@/shared/toast/toast";
import { useGoogleStore } from "@/domains/google/store/google.store";

interface TasksState {
	tasks: Task[];
	isLoading: boolean;
	error: string | null;

	fetchTasks: () => Promise<void>;
	_addOptimisticTask: (task: Task) => void;
	_removeOptimisticTask: (id: number) => void;
	addTask: (
		title: string,
		startDate?: Date | null,
		endDate?: Date | null,
		deadline?: Date | null,
		isAllDay?: boolean,
		listId?: number | null,
		priority?: TaskPriority,
	) => Promise<void>;
	toggleTask: (task: Task) => Promise<void>;
	updateTask: (
		id: number,
		patch: Partial<
			Pick<
				Task,
				| "title"
				| "description"
				| "isCompleted"
				| "startDate"
				| "endDate"
				| "isAllDay"
				| "deadline"
				| "priority"
				| "listId"
			>
		>,
	) => Promise<void>;
	deleteTask: (id: number) => Promise<void>;
}

function buildRequest(task: Task): UpdateTaskRequest {
	return {
		title: task.title,
		description: task.description,
		startAt: task.startDate ? task.startDate.toISOString() : null,
		endAt: task.endDate ? task.endDate.toISOString() : null,
		deadline: task.deadline ? task.deadline.toISOString() : null,
		priority: task.priority,
		status: task.isCompleted ? TaskStatus.Completed : TaskStatus.InProgress,
		listId: task.listId,
	};
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

	_addOptimisticTask: (task: Task) => {
		set((state) => ({ tasks: [task, ...state.tasks] }));
	},

	_removeOptimisticTask: (id: number) => {
		set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
	},

	addTask: async (
		title,
		startDate = null,
		endDate = null,
		deadline = null,
		isAllDay = false,
		listId = null,
		priority = TaskPriority.Low,
	) => {
		const request: CreateTaskRequest = {
			title: title.trim(),
			deadline: deadline ? deadline.toISOString() : null,
			startAt: startDate ? startDate.toISOString() : null,
			endAt: endDate ? endDate.toISOString() : null,
			priority,
			listId: listId ?? null,
		};
		const created = await apiCreateTask(request);
		const task = mapTaskResponseToTask(created);
		if (isAllDay && !task.isAllDay) {
			task.isAllDay = true;
		}
		set((state) => ({ tasks: [task, ...state.tasks] }));

		// Background sync if Google Calendar is connected
		const googleStore = useGoogleStore.getState();
		if (googleStore.isConnected) {
			googleStore.syncSilent();
		}
	},

	toggleTask: async (task: Task) => {
		const newIsCompleted = !task.isCompleted;

		set((state) => ({
			tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, isCompleted: newIsCompleted } : t)),
		}));

		const request = buildRequest({ ...task, isCompleted: newIsCompleted });

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

		set((state) => ({
			tasks: state.tasks.map((t) => (t.id === id ? merged : t)),
		}));

		const request: UpdateTaskRequest = {
			title: merged.title,
			description: merged.description,
			startAt: merged.startDate ? merged.startDate.toISOString() : null,
			endAt: merged.endDate ? merged.endDate.toISOString() : null,
			deadline: merged.deadline ? merged.deadline.toISOString() : null,
			priority: merged.priority,
			status: merged.isCompleted ? TaskStatus.Completed : TaskStatus.InProgress,
			listId: merged.listId,
		};

		try {
			const updated = await apiUpdateTask(id, request);
			const updatedTask = mapTaskResponseToTask(updated);
			if (patch.isAllDay !== undefined) {
				updatedTask.isAllDay = patch.isAllDay;
			}
			set((state) => ({
				tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
			}));
		} catch {
			set((state) => ({
				tasks: state.tasks.map((t) => (t.id === id ? current : t)),
			}));
			toastMessage.showError("Не удалось обновить задачу");
		}
	},

	deleteTask: async (id) => {
		await apiDeleteTask(id);
		set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
	},
}));

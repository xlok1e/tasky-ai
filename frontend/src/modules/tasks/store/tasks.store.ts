import { create } from "zustand";
import {
	fetchTasks as apiFetchTasks,
	createTask as apiCreateTask,
	updateTask as apiUpdateTask,
	deleteTask as apiDeleteTask,
} from "../api/tasks.api";
import type { CreateTaskRequest, UpdateTaskRequest } from "../types/task.api.types";
import { toastMessage } from "@/shared/toast/toast";
import { useGoogleStore } from "@/domains/google/store/google.store";
import { TaskPriority, TaskStatus } from "../types/task.enums";
import { AddTaskParams, Task } from "../types/task.types";
import { mapTaskResponseToTask } from "../utils/tasks.utils";

const TASKS_PAGE_SIZE = 20;

interface TasksState {
	tasks: Task[];
	isLoading: boolean;
	error: string | null;
	hasMore: boolean;
	dataVersion: number;

	fetchTasks: () => Promise<void>;
	fetchMoreTasks: () => Promise<void>;
	_addOptimisticTask: (task: Task) => void;
	_removeOptimisticTask: (id: number) => void;
	addTask: (params: AddTaskParams) => Promise<void>;
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
				| "priority"
				| "listId"
			>
		>,
	) => Promise<void>;
	deleteTask: (id: number) => Promise<void>;
}

type UpdateTaskPayload = UpdateTaskRequest & { isAllDay: boolean };

function buildRequest(task: Task): UpdateTaskPayload {
	return {
		title: task.title,
		description: task.description,
		startAt: task.startDate ? task.startDate.toISOString() : null,
		endAt: task.endDate ? task.endDate.toISOString() : null,
		deadline: task.deadline ? task.deadline.toISOString() : null,
		isAllDay: task.isAllDay,
		priority: task.priority,
		status: task.isCompleted ? TaskStatus.Completed : TaskStatus.InProgress,
		listId: task.listId,
	};
}

export const useTasksStore = create<TasksState>((set, get) => ({
	tasks: [],
	isLoading: false,
	error: null,
	hasMore: true,
	dataVersion: 0,

	fetchTasks: async () => {
		set({ isLoading: true, error: null });
		try {
			const data = await apiFetchTasks({ offset: 0, limit: TASKS_PAGE_SIZE });
			set({
				tasks: data.map(mapTaskResponseToTask),
				isLoading: false,
				hasMore: data.length >= TASKS_PAGE_SIZE,
				dataVersion: get().dataVersion + 1,
			});
		} catch {
			set({ isLoading: false, error: "Не удалось загрузить задачи" });
		}
	},

	fetchMoreTasks: async () => {
		const { tasks, hasMore, isLoading } = get();
		if (!hasMore || isLoading) return;
		set({ isLoading: true });
		try {
			const data = await apiFetchTasks({ offset: tasks.length, limit: TASKS_PAGE_SIZE });
			const newTasks = data.map(mapTaskResponseToTask);
			set((state) => ({
				tasks: [...state.tasks, ...newTasks],
				isLoading: false,
				hasMore: data.length >= TASKS_PAGE_SIZE,
			}));
		} catch {
			set({ isLoading: false });
		}
	},

	_addOptimisticTask: (task: Task) => {
		set((state) => ({ tasks: [task, ...state.tasks] }));
	},

	_removeOptimisticTask: (id: number) => {
		set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
	},

	addTask: async ({
		title,
		startDate = null,
		endDate = null,
		isAllDay = false,
		listId = null,
		priority = TaskPriority.Low,
	}: AddTaskParams) => {
		const request: CreateTaskRequest = {
			title: title.trim(),
			startAt: startDate ? startDate.toISOString() : null,
			endAt: endDate ? endDate.toISOString() : null,
			priority,
			listId: listId ?? null,
		};
		try {
			const created = await apiCreateTask(request);
			const task = { ...mapTaskResponseToTask(created), ...(isAllDay && { isAllDay: true }) };
			set((state) => ({ tasks: [task, ...state.tasks], dataVersion: state.dataVersion + 1 }));

			// Background sync if Google Calendar is connected
			const googleStore = useGoogleStore.getState();
			if (googleStore.isConnected) {
				googleStore.syncSilent();
			}
		} catch {
			toastMessage.showError("Не удалось создать задачу");
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
				dataVersion: state.dataVersion + 1,
			}));
			toastMessage.showSuccess(
				task.isCompleted ? "Выполнение задачи отменено" : "Задача успешно выполнена",
			);
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

		const request = buildRequest(merged);

		try {
			const updated = await apiUpdateTask(id, request);
			const updatedTask = mapTaskResponseToTask(updated);
			if (patch.isAllDay !== undefined) {
				updatedTask.isAllDay = patch.isAllDay;
			}
			set((state) => ({
				tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
				dataVersion: state.dataVersion + 1,
			}));
		} catch {
			set((state) => ({
				tasks: state.tasks.map((t) => (t.id === id ? current : t)),
			}));
			toastMessage.showError("Не удалось обновить задачу");
		}
	},

	deleteTask: async (id) => {
		const prev = get().tasks;
		set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
		try {
			await apiDeleteTask(id);
			set((state) => ({ dataVersion: state.dataVersion + 1 }));
		} catch {
			set({ tasks: prev });
			toastMessage.showError("Не удалось удалить задачу");
		}
	},
}));

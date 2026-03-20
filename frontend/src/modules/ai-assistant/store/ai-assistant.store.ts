import { create } from "zustand";
import { toast } from "sonner";
import {
	sendMessage as apiSendMessage,
	confirmTask as apiConfirmTask,
} from "../api/ai-assistant.api";
import { ChatRole } from "../types/ai-assistant.types";
import type { ChatMessage, PendingTask } from "../types/ai-assistant.types";
import { useTasksStore } from "@modules/tasks/store/tasks.store";
import { TaskPriority } from "@modules/tasks/types/task.types";
import type { Task } from "@modules/tasks/types/task.types";

interface AiAssistantState {
	messages: ChatMessage[];
	isLoading: boolean;
	sendMessage: (text: string) => Promise<void>;
	confirmTask: (messageId: string, task: PendingTask) => Promise<void>;
	rejectTask: (messageId: string) => void;
}

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const PENDING_TASK_PRIORITY_MAP: Record<PendingTask["priority"], TaskPriority> = {
	Low: TaskPriority.Low,
	Medium: TaskPriority.Medium,
	High: TaskPriority.High,
};

function pendingTaskToOptimisticTask(task: PendingTask, tempId: number): Task {
	return {
		id: tempId,
		title: task.title,
		description: task.description,
		dueDate: task.endAt ? new Date(task.endAt) : null,
		isCompleted: false,
		isAllDay: task.isAllDay,
		startDate: task.startAt ? new Date(task.startAt) : null,
		endDate: task.endAt ? new Date(task.endAt) : null,
		priority: PENDING_TASK_PRIORITY_MAP[task.priority],
	};
}

export const useAiAssistantStore = create<AiAssistantState>((set) => ({
	messages: [],
	isLoading: false,

	sendMessage: async (text: string) => {
		const trimmed = text.trim();
		if (!trimmed) return;

		const userMessage: ChatMessage = {
			id: generateId(),
			role: ChatRole.User,
			content: trimmed,
		};

		set((state) => ({ messages: [...state.messages, userMessage], isLoading: true }));

		try {
			const response = await apiSendMessage(trimmed);
			const assistantMessage: ChatMessage = {
				id: generateId(),
				role: ChatRole.Assistant,
				content: response.reply,
				pendingTask: response.pendingTask ?? null,
			};
			set((state) => ({
				messages: [...state.messages, assistantMessage],
				isLoading: false,
			}));
		} catch {
			set((state) => ({
				messages: state.messages.filter((m) => m.id !== userMessage.id),
				isLoading: false,
			}));
		}
	},

	confirmTask: async (messageId: string, task: PendingTask) => {
		// Use a negative temp ID to avoid any collision with real server IDs
		const tempId = -Date.now();
		const optimisticTask = pendingTaskToOptimisticTask(task, tempId);
		const tasksStore = useTasksStore.getState();

		tasksStore._addOptimisticTask(optimisticTask);

		try {
			await apiConfirmTask(task);
			await tasksStore.fetchTasks();
			set((state) => ({
				messages: state.messages.map((m) =>
					m.id === messageId ? { ...m, pendingTaskStatus: "confirmed" } : m,
				),
			}));
			toast.success("Задача создана успешно");
		} catch {
			tasksStore._removeOptimisticTask(tempId);
		}
	},

	rejectTask: (messageId: string) => {
		set((state) => ({
			messages: state.messages.map((m) =>
				m.id === messageId ? { ...m, pendingTaskStatus: "rejected" } : m,
			),
		}));
	},
}));

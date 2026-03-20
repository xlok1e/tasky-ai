import { create } from "zustand";
import { toast } from "sonner";
import {
	sendMessage as apiSendMessage,
	confirmTask as apiConfirmTask,
} from "../api/ai-assistant.api";
import { ChatRole } from "../types/ai-assistant.types";
import type { ChatMessage, PendingTask } from "../types/ai-assistant.types";
import { useTasksStore } from "@modules/tasks/store/tasks.store";
import { useGoogleStore } from "@/domains/google/store/google.store";
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
		listId: null,
		title: task.title,
		description: task.description,
		deadline: task.endAt ? new Date(task.endAt) : null,
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
		const tempId = -Date.now();
		const optimisticTask = pendingTaskToOptimisticTask(task, tempId);
		const tasksStore = useTasksStore.getState();

		// Mark as confirming
		set((state) => ({
			messages: state.messages.map((m) =>
				m.id === messageId ? { ...m, isConfirming: true } : m,
			),
		}));

		tasksStore._addOptimisticTask(optimisticTask);

		try {
			await apiConfirmTask(task);
			await tasksStore.fetchTasks();

			// Background sync if Google is connected (no toast)
			const googleStore = useGoogleStore.getState();
			if (googleStore.isConnected) {
				googleStore.syncSilent();
			}

			set((state) => ({
				messages: state.messages.map((m) =>
					m.id === messageId ? { ...m, isConfirming: false, pendingTaskStatus: "confirmed" } : m,
				),
			}));
			toast.success("Задача создана успешно");
		} catch {
			tasksStore._removeOptimisticTask(tempId);
			set((state) => ({
				messages: state.messages.map((m) =>
					m.id === messageId ? { ...m, isConfirming: false } : m,
				),
			}));
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

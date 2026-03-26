import { create } from "zustand";
import { toastMessage } from "@/shared/toast/toast";
import {
	sendMessage as apiSendMessage,
	confirmTask as apiConfirmTask,
	confirmUpdate as apiConfirmUpdate,
} from "../api/ai-assistant.api";
import { ChatRole } from "../types/ai-assistant.types";
import type { ChatMessage, PendingTask, PendingUpdate } from "../types/ai-assistant.types";
import { useTasksStore } from "@modules/tasks/store/tasks.store";
import { useGoogleStore } from "@/domains/google/store/google.store";
import { TaskPriority } from "@modules/tasks/types/task.types";
import type { Task } from "@modules/tasks/types/task.types";
import { formatDateRange } from "../utils/ai-assistsnt-utils";

interface AiAssistantState {
	messages: ChatMessage[];
	isLoading: boolean;
	sendMessage: (text: string) => Promise<void>;
	confirmTask: (messageId: string, task: PendingTask) => Promise<void>;
	rejectTask: (messageId: string) => void;
	confirmUpdate: (messageId: string, update: PendingUpdate) => Promise<void>;
	rejectUpdate: (messageId: string) => void;

	isAssistantChatOpen: boolean;
	onCloseAssistantChat: () => void;
	onOpenAssistantChat: () => void;
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
		isCompleted: false,
		isAllDay: task.isAllDay,
		startDate: task.startAt ? new Date(task.startAt) : null,
		endDate: task.endAt ? new Date(task.endAt) : null,
		deadline: null,
		priority: PENDING_TASK_PRIORITY_MAP[task.priority],
	};
}

function buildAssistantReply(
	reply: string,
	pendingTask?: PendingTask | null,
	pendingUpdate?: PendingUpdate | null,
): ChatMessage {
	let content = reply;

	if (pendingTask) {
		content += `\n\nЗадача: \nНазвание: ${pendingTask.title}\nОписание: ${pendingTask.description ?? "—"}\nПриоритет: ${pendingTask.priority}\nДата исполнения: ${formatDateRange(pendingTask.startAt, pendingTask.endAt, pendingTask.isAllDay)}\nСписок: ${pendingTask.listId ?? "—"}\n`;
	}

	return {
		id: generateId(),
		role: ChatRole.Assistant,
		content,
		pendingTask: pendingTask ?? null,
		pendingUpdate: pendingUpdate ?? null,
	};
}

function markAsConfirming(messages: ChatMessage[], messageId: string): ChatMessage[] {
	return messages.map((m) => (m.id === messageId ? { ...m, isConfirming: true } : m));
}

function markConfirmDone(
	messages: ChatMessage[],
	messageId: string,
	status: "confirmed" | "rejected",
): ChatMessage[] {
	return messages.map((m) =>
		m.id === messageId ? { ...m, isConfirming: false, pendingActionStatus: status } : m,
	);
}

function markConfirmFailed(messages: ChatMessage[], messageId: string): ChatMessage[] {
	return messages.map((m) => (m.id === messageId ? { ...m, isConfirming: false } : m));
}

export const useAiAssistantStore = create<AiAssistantState>((set) => ({
	messages: [],
	isLoading: false,
	isAssistantChatOpen: false,
	onCloseAssistantChat: () => set({ isAssistantChatOpen: false }),
	onOpenAssistantChat: () => set({ isAssistantChatOpen: true }),

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
			const assistantMessage = buildAssistantReply(
				response.reply,
				response.pendingTask,
				response.pendingUpdate,
			);
			set((state) => ({
				messages: [...state.messages, assistantMessage],
				isLoading: false,
			}));
		} catch {
			set((state) => ({
				messages: state.messages.filter((m) => m.id !== userMessage.id),
				isLoading: false,
			}));
			toastMessage.showError("Не удалось отправить сообщение. Попробуйте ещё раз.");
		}
	},

	confirmTask: async (messageId: string, task: PendingTask) => {
		const tempId = -Date.now();
		const optimisticTask = pendingTaskToOptimisticTask(task, tempId);
		const tasksStore = useTasksStore.getState();

		set((state) => ({ messages: markAsConfirming(state.messages, messageId) }));
		tasksStore._addOptimisticTask(optimisticTask);

		try {
			await apiConfirmTask(task);
			await tasksStore.fetchTasks();

			const googleStore = useGoogleStore.getState();
			if (googleStore.isConnected) {
				googleStore.syncSilent();
			}

			set((state) => ({
				messages: markConfirmDone(state.messages, messageId, "confirmed"),
			}));
			toastMessage.showSuccess("Задача создана успешно");
		} catch {
			tasksStore._removeOptimisticTask(tempId);
			set((state) => ({ messages: markConfirmFailed(state.messages, messageId) }));
			toastMessage.showError("Не удалось создать задачу. Попробуйте ещё раз.");
		}
	},

	rejectTask: (messageId: string) => {
		set((state) => ({
			messages: markConfirmDone(state.messages, messageId, "rejected"),
		}));
	},

	confirmUpdate: async (messageId: string, update: PendingUpdate) => {
		const tasksStore = useTasksStore.getState();

		set((state) => ({ messages: markAsConfirming(state.messages, messageId) }));

		try {
			await apiConfirmUpdate(update);
			await tasksStore.fetchTasks();

			const googleStore = useGoogleStore.getState();
			if (googleStore.isConnected) {
				googleStore.syncSilent();
			}

			set((state) => ({
				messages: markConfirmDone(state.messages, messageId, "confirmed"),
			}));
			toastMessage.showSuccess("Задача обновлена успешно");
		} catch {
			set((state) => ({ messages: markConfirmFailed(state.messages, messageId) }));
			toastMessage.showError("Не удалось обновить задачу. Попробуйте ещё раз.");
		}
	},

	rejectUpdate: (messageId: string) => {
		set((state) => ({
			messages: markConfirmDone(state.messages, messageId, "rejected"),
		}));
	},
}));

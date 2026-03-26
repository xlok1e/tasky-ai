import { RefObject } from "react";
import { TaskStatus } from "@modules/tasks/types/task.types";

export enum ChatRole {
	User = "user",
	Assistant = "assistant",
}

export interface PendingTask {
	title: string;
	priority: "Low" | "Medium" | "High";
	description: string | null;
	startAt: string | null;
	endAt: string | null;
	isAllDay: boolean;
	listId: string | null;
}

export interface PendingUpdate {
	taskId: number;
	title: string | null;
	description: string | null;
	startAt: string | null;
	endAt: string | null;
	isAllDay: boolean | null;
	status: TaskStatus | null;
}

export type PendingActionStatus = "confirmed" | "rejected";

export interface ChatMessage {
	id: string;
	role: ChatRole;
	content: string;
	pendingTask?: PendingTask | null;
	pendingUpdate?: PendingUpdate | null;
	pendingActionStatus?: PendingActionStatus | null;
	isConfirming?: boolean;
}

export interface ChatRequest {
	message: string;
}

export interface ChatResponse {
	reply: string;
	intent: string | null;
	pendingTask?: PendingTask | null;
	pendingUpdate?: PendingUpdate | null;
}

export interface ConfirmTaskRequest {
	task: PendingTask;
}

export interface ConfirmUpdateRequest {
	update: PendingUpdate;
}

export interface AiAssistantMessagesProps {
	isLoading: boolean;
	bottomRef: RefObject<HTMLDivElement | null>;
	onConfirmTask: (messageId: string, task: PendingTask) => void;
	onRejectTask: (messageId: string) => void;
	onConfirmUpdate: (messageId: string, update: PendingUpdate) => void;
	onRejectUpdate: (messageId: string) => void;
}

export interface ChatMessageProps {
	message: ChatMessage;
	onConfirm: () => void;
	onReject: () => void;
}

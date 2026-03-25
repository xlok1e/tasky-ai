import { RefObject } from "react";
import type { ChatMessage as ChatMessageType } from "../types/ai-assistant.types";

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

export interface ChatMessage {
	id: string;
	role: ChatRole;
	content: string;
	pendingTask?: PendingTask | null;
	pendingTaskStatus?: "confirmed" | "rejected" | null;
	isConfirming?: boolean;
}

export interface ChatRequest {
	message: string;
}

export interface ChatResponse {
	reply: string;
	pendingTask?: PendingTask | null;
}

export interface ConfirmTaskRequest {
	task: PendingTask;
}

export interface AiAssistantMessagesProps {
	isLoading: boolean;
	bottomRef: RefObject<HTMLDivElement | null>;
	onConfirmTask: (messageId: string, task: PendingTask) => void;
	onRejectTask: (messageId: string) => void;
}

export interface ChatMessageProps {
	message: ChatMessageType;
	onConfirm: () => void;
	onReject: () => void;
}

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
}

export interface ChatMessage {
	id: string;
	role: ChatRole;
	content: string;
	pendingTask?: PendingTask | null;
	pendingTaskStatus?: "confirmed" | "rejected" | null;
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

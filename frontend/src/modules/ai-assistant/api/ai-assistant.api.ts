import apiClient from "@shared/lib/axios";
import type {
	ChatResponse,
	ConfirmTaskRequest,
	ConfirmUpdateRequest,
	PendingTask,
	PendingUpdate,
} from "@modules/ai-assistant/types/ai-assistant.types";
import type { TaskResponse } from "@modules/tasks/types/task.types";

export async function sendMessage(message: string): Promise<ChatResponse> {
	const response = await apiClient.post<ChatResponse>("/api/ai-assistant/chat", { message });
	return response.data;
}

export async function confirmTask(task: PendingTask): Promise<void> {
	const body: ConfirmTaskRequest = { task };
	await apiClient.post("/api/ai-assistant/confirm-task", body);
}

export async function confirmUpdate(update: PendingUpdate): Promise<TaskResponse> {
	const body: ConfirmUpdateRequest = { update };
	const response = await apiClient.post<TaskResponse>("/api/ai-assistant/confirm-update", body);
	return response.data;
}

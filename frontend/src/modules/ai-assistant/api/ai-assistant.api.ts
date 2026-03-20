import apiClient from "@shared/lib/axios";
import type { ChatResponse, ConfirmTaskRequest, PendingTask } from "@modules/ai-assistant/types/ai-assistant.types";

export async function sendMessage(message: string): Promise<ChatResponse> {
	const response = await apiClient.post<ChatResponse>("/api/ai-assistant/chat", { message });
	return response.data;
}

export async function confirmTask(task: PendingTask): Promise<void> {
	const body: ConfirmTaskRequest = { task };
	await apiClient.post("/api/ai-assistant/confirm-task", body);
}

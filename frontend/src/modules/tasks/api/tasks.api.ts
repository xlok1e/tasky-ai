import apiClient from "@shared/lib/axios";
import type {
	TaskResponse,
	CreateTaskRequest,
	UpdateTaskRequest,
} from "@modules/tasks/types/task.api.types";

interface FetchTasksParams {
	listId?: number;
	inboxOnly?: boolean;
	offset?: number;
	limit?: number;
	dateOrder?: "asc" | "desc";
	priorityOrder?: "asc" | "desc";
	startFrom?: string;
	startTo?: string;
}

export async function fetchTasks(params?: FetchTasksParams): Promise<TaskResponse[]> {
	const response = await apiClient.get<TaskResponse[]>("/api/tasks", {
		params: {
			listId: params?.listId,
			inboxOnly: params?.inboxOnly,
			offset: params?.offset,
			limit: params?.limit,
			dateOrder: params?.dateOrder,
			priorityOrder: params?.priorityOrder,
			startFrom: params?.startFrom,
			startTo: params?.startTo,
		},
	});
	return response.data;
}

export async function createTask(data: CreateTaskRequest): Promise<TaskResponse> {
	const response = await apiClient.post<TaskResponse>("/api/tasks", data);
	return response.data;
}

export async function updateTask(id: number, data: UpdateTaskRequest): Promise<TaskResponse> {
	const response = await apiClient.patch<TaskResponse>(`/api/tasks/${id}`, data);
	return response.data;
}

export async function deleteTask(id: number): Promise<void> {
	await apiClient.delete(`/api/tasks/${id}`);
}

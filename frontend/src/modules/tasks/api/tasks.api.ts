import apiClient from "@shared/lib/axios";
import type {
	TaskResponse,
	CreateTaskRequest,
	UpdateTaskRequest,
} from "@modules/tasks/types/task.api.types";

interface FetchTasksParams {
	offset?: number;
	limit?: number;
}

export async function fetchTasks(params?: FetchTasksParams): Promise<TaskResponse[]> {
	const response = await apiClient.get<TaskResponse[]>("/api/tasks", {
		params: {
			offset: params?.offset,
			limit: params?.limit,
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

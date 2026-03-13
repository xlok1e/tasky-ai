import apiClient from "@shared/lib/axios";
import type { TaskResponse, CreateTaskRequest, UpdateTaskRequest } from "@modules/tasks/types/task.types";

export async function fetchTasks(): Promise<TaskResponse[]> {
  const response = await apiClient.get<TaskResponse[]>("/api/tasks");
  return response.data;
}

export async function createTask(data: CreateTaskRequest): Promise<TaskResponse> {
  const response = await apiClient.post<TaskResponse>("/api/tasks", data);
  return response.data;
}

export async function updateTask(
  id: number,
  data: UpdateTaskRequest
): Promise<TaskResponse> {
  const response = await apiClient.put<TaskResponse>(`/api/tasks/${id}`, data);
  return response.data;
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/api/tasks/${id}`);
}

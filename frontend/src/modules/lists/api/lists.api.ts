import apiClient from "@shared/lib/axios";
import type {
	CreateListRequest,
	CreateListResponse,
	ListResponse,
	ListTasksResponse,
	UpdateListRequest,
} from "@modules/lists/types/list.types";

export async function fetchLists(): Promise<ListResponse[]> {
	const response = await apiClient.get<ListResponse[]>("/api/lists");
	return response.data;
}

export async function fetchListTasks(listId: number): Promise<ListTasksResponse> {
	const response = await apiClient.get<ListTasksResponse>(`/api/lists/${listId}/tasks`);
	return response.data;
}

export async function createList(data: CreateListRequest): Promise<CreateListResponse> {
	const response = await apiClient.post<CreateListResponse>("/api/lists", data);
	return response.data;
}

export async function updateList(listId: number, data: UpdateListRequest): Promise<ListResponse> {
	const response = await apiClient.patch<ListResponse>(`/api/lists/${listId}`, data);
	return response.data;
}

export async function deleteList(listId: number): Promise<void> {
	await apiClient.delete(`/api/lists/${listId}`);
}

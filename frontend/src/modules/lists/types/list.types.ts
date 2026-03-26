import type { TaskResponse } from "@modules/tasks/types/task.api.types";

/** Mirrors backend ListResponse DTO */
export interface ListResponse {
  id: number;
  name: string;
  colorHex: string;
  uncompletedTasksCount: number;
  createdAt: string;
}

export interface ListTasksResponse {
  totalCount: number;
  tasks: TaskResponse[];
}

export interface CreateListRequest {
  name: string;
  colorHex: string;
}

export interface CreateListResponse {
  id: number;
  name: string;
  colorHex: string;
  uncompletedTasksCount: number;
  createdAt: string;
}

export enum TaskPriority {
  Low = 0,
  Medium = 1,
  High = 2,
}

export enum TaskStatus {
  InProgress = 0,
  Completed = 1,
}

/** Shape returned by the backend */
export interface TaskResponse {
  id: number;
  userId: number;
  listId: number | null;
  listName: string | null;
  title: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
  googleEventId: string | null;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  deadline?: string | null;
  priority: TaskPriority;
  listId?: number | null;
}

export interface UpdateTaskRequest {
  title: string;
  description?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  deadline?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  listId?: number | null;
}

/** Client-side task representation */
export interface Task {
  id: number;
  listId: number | null;
  title: string;
  description: string | null;
  dueDate: Date | null;
  isCompleted: boolean;
  isAllDay: boolean;
  startDate: Date | null;
  endDate: Date | null;
  priority: TaskPriority;
}

function deriveIsAllDay(startAt: string | null, endAt: string | null): boolean {
  if (!startAt || !endAt) return false;
  const start = new Date(startAt);
  const end = new Date(endAt);
  return (
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    start.getSeconds() === 0 &&
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getSeconds() === 0 &&
    end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000
  );
}

export function mapTaskResponseToTask(r: TaskResponse): Task {
  return {
    id: r.id,
    listId: r.listId,
    title: r.title,
    description: r.description,
    dueDate: r.deadline ? new Date(r.deadline) : null,
    isCompleted: r.status === TaskStatus.Completed,
    isAllDay: deriveIsAllDay(r.startAt, r.endAt),
    startDate: r.startAt ? new Date(r.startAt) : null,
    endDate: r.endAt ? new Date(r.endAt) : null,
    priority: r.priority,
  };
}


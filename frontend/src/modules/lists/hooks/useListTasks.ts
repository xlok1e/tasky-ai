"use client";

import { useEffect, useState } from "react";
import { fetchListTasks } from "@modules/lists/api/lists.api";
import { mapTaskResponseToTask } from "@modules/tasks/utils/tasks.utils";
import type { Task } from "@modules/tasks/types/task.types";

interface UseListTasksResult {
	tasks: Task[];
	isLoading: boolean;
	error: string | null;
}

export function useListTasks(listId: number): UseListTasksResult {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		setIsLoading(true);
		setError(null);

		fetchListTasks(listId)
			.then((data) => {
				if (!cancelled) {
					setTasks(data.tasks.map(mapTaskResponseToTask));
					setIsLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setError("Не удалось загрузить задачи списка");
					setIsLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [listId]);

	return { tasks, isLoading, error };
}

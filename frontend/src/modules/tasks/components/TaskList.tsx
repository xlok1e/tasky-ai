"use client";

import { useTasksStore } from "../store/tasks.store";
import { TaskRow } from "./TaskRow";
import type { Task } from "../types/task.types";

interface TaskListProps {
	listId?: number;
	tasks?: Task[];
	isLoading?: boolean;
	error?: string | null;
}

export function TaskList({
	listId,
	tasks: tasksProp,
	isLoading: isLoadingProp,
	error: errorProp,
}: TaskListProps = {}) {
	const storeTasks = useTasksStore((s) => s.tasks);
	const storeIsLoading = useTasksStore((s) => s.isLoading);
	const storeError = useTasksStore((s) => s.error);

	const isLoading = isLoadingProp ?? storeIsLoading;
	const error = errorProp ?? storeError;

	const tasks =
		tasksProp ??
		(listId !== undefined
			? storeTasks.filter((t) => t.listId === listId)
			: storeTasks.filter((t) => t.listId === null));

	const pendingTasks = tasks.filter((t) => !t.isCompleted);
	const completedTasks = tasks.filter((t) => t.isCompleted);

	if (isLoading) {
		return <p className="py-8 text-center text-sm text-muted-foreground">Загрузка…</p>;
	}

	if (error) {
		return <p className="py-8 text-center text-sm text-destructive">{error}</p>;
	}

	return (
		<div className="flex flex-col gap-6">
			<section className="flex flex-col gap-2">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Не выполнено
					{pendingTasks.length > 0 && (
						<span className="ml-2 font-normal normal-case">({pendingTasks.length})</span>
					)}
				</h2>
				{pendingTasks.length === 0 ? (
					<p className="py-4 text-center text-sm text-muted-foreground">Нет активных задач</p>
				) : (
					<div className="flex flex-col gap-1">
						{pendingTasks.map((task) => (
							<TaskRow key={task.id} task={task} />
						))}
					</div>
				)}
			</section>

			{completedTasks.length > 0 && (
				<section className="flex flex-col gap-2">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
						Выполнено
						<span className="ml-2 font-normal normal-case">({completedTasks.length})</span>
					</h2>
					<div className="flex flex-col gap-1">
						{completedTasks.map((task) => (
							<TaskRow key={task.id} task={task} />
						))}
					</div>
				</section>
			)}
		</div>
	);
}

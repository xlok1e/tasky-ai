"use client";

import { Button } from "@shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/select";
import { Separator } from "@shared/ui/separator";
import { useListsStore } from "@modules/lists/store/lists.store";
import { useTaskModal } from "../store/task-modal.store";
import { useTasksStore } from "../store/tasks.store";
import type { TaskListProps } from "../types/task.types";
import { Spinner } from "@shared/ui/spinner";
import { TaskListSection } from "./TaskListSection";

export function TaskList({
	listId,
	tasks: tasksProp,
	isLoading: isLoadingProp,
	error: errorProp,
}: TaskListProps = {}) {
	const storeTasks = useTasksStore((s) => s.tasks);
	const storeIsLoading = useTasksStore((s) => s.isLoading);
	const storeError = useTasksStore((s) => s.error);
	const hasMore = useTasksStore((s) => s.hasMore);
	const fetchMoreTasks = useTasksStore((s) => s.fetchMoreTasks);
	const openNew = useTaskModal((s) => s.openNew);
	const listName = useListsStore((s) =>
		listId === undefined
			? "Входящие"
			: (s.lists.find((list) => list.id === listId)?.name ?? "Список"),
	);

	const isLoading = isLoadingProp ?? storeIsLoading;
	const error = errorProp ?? storeError;

	const tasks =
		tasksProp ??
		(listId !== undefined
			? storeTasks.filter((task) => task.listId === listId)
			: storeTasks.filter((task) => task.listId === null));

	const pendingTasks = tasks.filter((task) => !task.isCompleted);
	const completedTasks = tasks.filter((task) => task.isCompleted);

	if (isLoading) {
		return <Spinner />;
	}

	if (error) {
		return <p className="py-8 text-center text-sm text-destructive">{error}</p>;
	}

	return (
		<div className="flex w-full flex-col gap-[45px]">
			<div className="flex w-full items-end justify-between gap-6">
				<div className="flex flex-col gap-[22px]">
					<h1 className="text-[22px] leading-6 font-bold text-foreground">{listName}</h1>
					<Button
						type="button"
						variant="outline"
						size="default"
						onClick={() => openNew({ listId: listId ?? null })}
						className="h-auto w-fit rounded-[6px] border-border bg-secondary px-4 py-2 text-[18px] leading-6 font-normal text-foreground shadow-none hover:bg-secondary/90"
					>
						Добавить задачу
					</Button>
				</div>

				<div className="flex items-center gap-2">
					<Select>
						<SelectTrigger className="h-auto w-[204px] rounded-[6px] border-border bg-card px-3 py-2 text-[14px] leading-6 text-foreground shadow-none">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="border border-border bg-background">
							<SelectItem value="date-asc">По дате</SelectItem>
							<SelectItem value="date-desc">Сначала поздние</SelectItem>
						</SelectContent>
					</Select>

					<Select>
						<SelectTrigger className="h-auto w-[204px] rounded-[6px] border-border bg-card px-3 py-2 text-[14px] leading-6 text-foreground shadow-none">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="border border-border bg-background">
							<SelectItem value="priority-desc">По приоритету</SelectItem>
							<SelectItem value="priority-asc">Сначала низкий</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex w-full flex-col gap-6">
				<TaskListSection title="Не выполнено" tasks={pendingTasks} />
				<Separator className="bg-border" />
				<TaskListSection title="Выполнено" tasks={completedTasks} />
			</div>

			{hasMore && (
				<Button
					variant="outline"
					className="w-fit mx-auto"
					onClick={fetchMoreTasks}
					disabled={isLoading}
				>
					{isLoading ? "Загрузка..." : "Показать ещё"}
				</Button>
			)}
		</div>
	);
}

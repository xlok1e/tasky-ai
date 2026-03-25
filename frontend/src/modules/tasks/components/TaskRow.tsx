"use client";

import { Checkbox } from "@shared/ui/checkbox";
import { useTasksStore } from "../store/tasks.store";
import { useTaskModal } from "../store/task-modal.store";
import type { TaskRowProps } from "../types/task.types";
import { formatTaskDate } from "../utils/tasks.utils";

export function TaskRow({ task }: TaskRowProps) {
	const toggleTask = useTasksStore((s) => s.toggleTask);
	const openEdit = useTaskModal((s) => s.openEdit);

	const handleCheckedChange = (e: React.MouseEvent) => {
		e.stopPropagation();
		toggleTask(task);
	};

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={() => openEdit(task)}
			className="flex h-7 w-full items-center justify-between gap-[18px] rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 cursor-pointer hover:bg-accent/50 py-4.5 px-4 duration-100"
		>
			<div className="flex min-w-0 items-center gap-2">
				<Checkbox
					checked={task.isCompleted}
					onClick={handleCheckedChange}
					className="size-6 rounded-[4px] border-border bg-card text-primary shadow-none [&_svg]:size-[18px] cursor-pointer"
					aria-label={`Отметить задачу ${task.title}`}
				/>
				<span className="truncate text-base leading-7 text-foreground">{task.title}</span>
			</div>
			<span className="text-muted-foreground w-[255px] shrink-0 text-right text-base leading-7">
				{formatTaskDate(task)}
			</span>
		</div>
	);
}

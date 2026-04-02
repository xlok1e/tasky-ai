"use client";

import { Trash2 } from "lucide-react";
import { useContextMenu } from "@shared/lib/use-context-menu";
import { Button } from "@shared/ui/button";
import { Checkbox } from "@shared/ui/checkbox";
import { ContextActionsPopover } from "@shared/ui/context-actions-popover";
import { useTasksStore } from "../store/tasks.store";
import { useTaskModal } from "../store/task-modal.store";
import type { TaskRowProps } from "../types/task.types";
import { formatTaskDate } from "../utils/tasks.utils";

export function TaskRow({ task }: TaskRowProps) {
	const toggleTask = useTasksStore((s) => s.toggleTask);
	const deleteTask = useTasksStore((s) => s.deleteTask);
	const openEdit = useTaskModal((s) => s.openEdit);
	const contextMenu = useContextMenu();

	const handleCheckedChange = (event: React.MouseEvent) => {
		event.stopPropagation();
		toggleTask(task);
	};

	const handleDelete = () => {
		contextMenu.close();
		void deleteTask(task.id);
	};

	return (
		<>
			<div
				role="button"
				tabIndex={0}
				onClick={() => openEdit(task)}
				onContextMenu={contextMenu.openFromMouseEvent}
				className="flex h-7 w-full cursor-pointer items-center justify-between gap-[18px] rounded-[6px] px-4 py-4.5 transition-colors duration-100 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
			>
				<div className="flex min-w-0 items-center gap-2">
					<Checkbox
						checked={task.isCompleted}
						onClick={handleCheckedChange}
						className="size-6 cursor-pointer rounded-[4px] border-border bg-card text-primary shadow-none [&_svg]:size-[18px]"
						aria-label={`Отметить задачу ${task.title}`}
					/>
					<span className="truncate text-base leading-7 text-foreground">{task.title}</span>
				</div>
				<span className="w-[255px] shrink-0 text-right text-base leading-7 text-muted-foreground">
					{formatTaskDate(task)}
				</span>
			</div>

			<ContextActionsPopover
				open={contextMenu.isOpen}
				position={contextMenu.position}
				onOpenChange={contextMenu.setIsOpen}
			>
				<div className="flex flex-col gap-1">
					<Button
						type="button"
						variant="ghost"
						className="w-full justify-start px-3 text-destructive hover:text-destructive"
						onClick={handleDelete}
					>
						<Trash2 className="size-4" />
						Удалить
					</Button>
				</div>
			</ContextActionsPopover>
		</>
	);
}

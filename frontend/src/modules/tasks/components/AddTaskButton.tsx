"use client";

import { Plus } from "lucide-react";
import { Button } from "@shared/ui/button";
import { useTaskModal } from "../store/task-modal.store";

interface AddTaskButtonProps {
	listId?: number | null;
}

export function AddTaskButton({ listId }: AddTaskButtonProps = {}) {
	const openNew = useTaskModal((s) => s.openNew);

	return (
		<Button variant="outline" className="w-fit gap-2" onClick={() => openNew({ listId })}>
			<Plus size={16} />
			Добавить задачу
		</Button>
	);
}

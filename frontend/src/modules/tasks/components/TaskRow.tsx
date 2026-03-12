"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Checkbox } from "ui/checkbox";
import { useTasksStore } from "../store/tasks.store";
import { useTaskModal } from "../store/task-modal.store";
import type { Task } from "../types/task.types";

interface TaskRowProps {
  task: Task;
}

export function TaskRow({ task }: TaskRowProps) {
  const toggleTask = useTasksStore((s) => s.toggleTask);
  const openEdit = useTaskModal((s) => s.openEdit);

  const handleCheckedChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTask(task.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openEdit(task)}
      onKeyDown={(e) => e.key === "Enter" && openEdit(task)}
      className="flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors hover:bg-accent/30"
    >
      <div onClick={handleCheckedChange}>
        <Checkbox
          id={`task-${task.id}`}
          checked={task.isCompleted}
        />
      </div>
      <span
        className={`flex-1 text-sm ${task.isCompleted ? "text-muted-foreground line-through" : ""}`}
      >
        {task.title}
      </span>
      {task.dueDate && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {format(task.dueDate, "d MMM", { locale: ru })}
        </span>
      )}
    </div>
  );
}

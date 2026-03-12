"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Checkbox } from "ui/checkbox";
import { useTasksStore } from "../store/tasks.store";
import type { Task } from "../types/task.types";

interface TaskRowProps {
  task: Task;
}

export function TaskRow({ task }: TaskRowProps) {
  const toggleTask = useTasksStore((s) => s.toggleTask);

  const handleCheckedChange = () => {
    toggleTask(task.id);
  };

  return (
    <div className="flex items-center gap-3 rounded-md border px-4 py-3 transition-colors hover:bg-accent/30">
      <Checkbox
        id={`task-${task.id}`}
        checked={task.isCompleted}
        onCheckedChange={handleCheckedChange}
      />
      <label
        htmlFor={`task-${task.id}`}
        className={`flex-1 cursor-pointer text-sm ${task.isCompleted ? "text-muted-foreground line-through" : ""}`}
      >
        {task.title}
      </label>
      {task.dueDate && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {format(task.dueDate, "d MMM", { locale: ru })}
        </span>
      )}
    </div>
  );
}

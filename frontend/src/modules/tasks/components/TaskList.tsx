"use client";

import { useTasksStore } from "../store/tasks.store";
import { TaskRow } from "./TaskRow";

export function TaskList() {
  const tasks = useTasksStore((s) => s.tasks);
  const pendingTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Не выполнено
          {pendingTasks.length > 0 && (
            <span className="ml-2 font-normal normal-case">
              ({pendingTasks.length})
            </span>
          )}
        </h2>
        {pendingTasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Нет активных задач
          </p>
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
            <span className="ml-2 font-normal normal-case">
              ({completedTasks.length})
            </span>
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

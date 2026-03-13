"use client";

import { useEffect } from "react";
import { useTasksStore } from "../store/tasks.store";

export function TasksInitializer() {
  const fetchTasks = useTasksStore((s) => s.fetchTasks);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return null;
}

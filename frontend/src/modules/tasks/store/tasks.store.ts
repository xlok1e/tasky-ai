import { create } from "zustand";
import type { Task } from "../types/task.types";

let nextId = 4;

interface TasksState {
  tasks: Task[];
  addTask: (title: string, dueDate: Date | null) => void;
  toggleTask: (id: string) => void;
}

export const useTasksStore = create<TasksState>((set) => ({
  tasks: [
    {
      id: "1",
      title: "Подготовить презентацию",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      isCompleted: false,
    },
    {
      id: "2",
      title: "Сдать отчёт",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      isCompleted: false,
    },
    {
      id: "3",
      title: "Прочитать главу учебника",
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isCompleted: true,
    },
  ],

  addTask: (title, dueDate) =>
    set((state) => ({
      tasks: [
        { id: String(nextId++), title: title.trim(), dueDate, isCompleted: false },
        ...state.tasks,
      ],
    })),

  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
      ),
    })),
}));


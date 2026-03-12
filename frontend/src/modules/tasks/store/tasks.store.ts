import { create } from "zustand";
import type { Task } from "../types/task.types";

let nextId = 4;

interface TasksState {
  tasks: Task[];
  addTask: (
    title: string,
    dueDate: Date | null,
    startDate?: Date | null,
    endDate?: Date | null,
    isAllDay?: boolean
  ) => void;
  toggleTask: (id: string) => void;
  updateTask: (
    id: string,
    patch: Partial<Pick<Task, "title" | "dueDate" | "isCompleted" | "startDate" | "endDate" | "isAllDay">>
  ) => void;
  deleteTask: (id: string) => void;
}

export const useTasksStore = create<TasksState>((set) => ({
  tasks: [
    {
      id: "1",
      title: "Подготовить презентацию",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      isCompleted: false,
      isAllDay: false,
      startDate: (() => { const d = new Date(); d.setHours(10, 0, 0, 0); d.setDate(d.getDate() + 2); return d; })(),
      endDate: (() => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + 2); return d; })(),
    },
    {
      id: "2",
      title: "Сдать отчёт",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      isCompleted: false,
      isAllDay: false,
      startDate: null,
      endDate: null,
    },
    {
      id: "3",
      title: "Прочитать главу учебника",
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isCompleted: true,
      isAllDay: false,
      startDate: null,
      endDate: null,
    },
  ],

  addTask: (title, dueDate, startDate = null, endDate = null, isAllDay = false) =>
    set((state) => ({
      tasks: [
        {
          id: String(nextId++),
          title: title.trim(),
          dueDate,
          isCompleted: false,
          isAllDay: isAllDay ?? false,
          startDate: startDate ?? null,
          endDate: endDate ?? null,
        },
        ...state.tasks,
      ],
    })),

  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
      ),
    })),

  updateTask: (id, patch) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),
}));

import { create } from "zustand";
import type { Task } from "../types/task.types";

interface TaskModalState {
  isOpen: boolean;
  editingTask: Task | null;
  openNew: () => void;
  openEdit: (task: Task) => void;
  close: () => void;
}

export const useTaskModal = create<TaskModalState>((set) => ({
  isOpen: false,
  editingTask: null,
  openNew: () => set({ isOpen: true, editingTask: null }),
  openEdit: (task) => set({ isOpen: true, editingTask: task }),
  close: () => set({ isOpen: false, editingTask: null }),
}));

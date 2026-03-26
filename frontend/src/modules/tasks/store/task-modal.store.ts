import { create } from "zustand";
import type { Task } from "../types/task.types";

export interface TaskModalPrefill {
	startDate?: Date;
	endDate?: Date;
	listId?: number | null;
}

interface TaskModalState {
	isOpen: boolean;
	editingTask: Task | null;
	prefill: TaskModalPrefill | null;
	openNew: (prefill?: TaskModalPrefill) => void;
	openEdit: (task: Task) => void;
	close: () => void;
}

export const useTaskModal = create<TaskModalState>((set) => ({
	isOpen: false,
	editingTask: null,
	prefill: null,
	openNew: (prefill) => set({ isOpen: true, editingTask: null, prefill: prefill ?? null }),
	openEdit: (task) => set({ isOpen: true, editingTask: task, prefill: null }),
	close: () => set({ isOpen: false, editingTask: null, prefill: null }),
}));

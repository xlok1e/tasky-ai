import { create } from "zustand";
import type { ListResponse } from "@modules/lists/types/list.types";

interface ListsModalState {
	isOpen: boolean;
	editingList: ListResponse | null;
	onOpen: () => void;
	openForEdit: (list: ListResponse) => void;
	onClose: () => void;
}

export const useListsModal = create<ListsModalState>((set) => ({
	isOpen: false,
	editingList: null,

	onOpen: () => set({ isOpen: true, editingList: null }),

	openForEdit: (list: ListResponse) => set({ isOpen: true, editingList: list }),

	onClose: () => set({ isOpen: false, editingList: null }),
}));

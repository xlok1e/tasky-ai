import { create } from "zustand";
import {
	fetchLists as apiFetchLists,
	createList as apiCreateList,
	updateList as apiUpdateList,
	deleteList as apiDeleteList,
} from "@modules/lists/api/lists.api";
import type {
	CreateListRequest,
	ListResponse,
	UpdateListRequest,
} from "@modules/lists/types/list.types";

interface ListsState {
	lists: ListResponse[];
	isLoading: boolean;
	error: string | null;
	fetchLists: () => Promise<void>;
	createList: (data: CreateListRequest) => Promise<void>;
	updateList: (listId: number, data: UpdateListRequest) => Promise<void>;
	deleteList: (listId: number) => Promise<void>;
}

export const useListsStore = create<ListsState>((set) => ({
	lists: [],
	isLoading: false,
	error: null,

	fetchLists: async () => {
		set({ isLoading: true, error: null });
		try {
			const data = await apiFetchLists();
			set({ lists: data, isLoading: false });
		} catch {
			set({ isLoading: false, error: "Не удалось загрузить списки" });
		}
	},

	createList: async (data: CreateListRequest) => {
		set({ isLoading: true, error: null });
		try {
			const result = await apiCreateList(data);
			set((state) => ({ lists: [...state.lists, result], isLoading: false }));
		} catch (error) {
			set({ isLoading: false, error: "Не удалось создать список" });
			throw error;
		}
	},

	updateList: async (listId: number, data: UpdateListRequest) => {
		set({ isLoading: true, error: null });
		try {
			const result = await apiUpdateList(listId, data);
			set((state) => ({
				lists: state.lists.map((list) => (list.id === listId ? result : list)),
				isLoading: false,
			}));
		} catch (error) {
			set({ isLoading: false, error: "Не удалось обновить список" });
			throw error;
		}
	},

	deleteList: async (listId: number) => {
		set({ isLoading: true, error: null });
		try {
			await apiDeleteList(listId);
			set((state) => ({
				lists: state.lists.filter((list) => list.id !== listId),
				isLoading: false,
			}));
		} catch (error) {
			set({ isLoading: false, error: "Не удалось удалить список" });
			throw error;
		}
	},
}));

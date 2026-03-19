import { create } from "zustand";
import { fetchLists as apiFetchLists } from "@modules/lists/api/lists.api";
import type { ListResponse } from "@modules/lists/types/list.types";

interface ListsState {
  lists: ListResponse[];
  isLoading: boolean;
  error: string | null;
  fetchLists: () => Promise<void>;
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
}));

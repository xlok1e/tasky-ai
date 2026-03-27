import { create } from "zustand";
import type { ListResponse } from "@modules/lists/types/list.types";

interface DeleteListModalState {
  isOpen: boolean;
  listToDelete: ListResponse | null;
  openForDelete: (list: ListResponse) => void;
  onClose: () => void;
}

export const useDeleteListModal = create<DeleteListModalState>((set) => ({
  isOpen: false,
  listToDelete: null,

  openForDelete: (list: ListResponse) =>
    set({ isOpen: true, listToDelete: list }),

  onClose: () => set({ isOpen: false, listToDelete: null }),
}));

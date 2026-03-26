import { create } from "zustand";

interface ListsModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}
export const useListsModal = create<ListsModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

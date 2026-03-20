"use client";

import { useEffect } from "react";
import { useListsStore } from "@modules/lists/store/lists.store";

export function ListsInitializer() {
  const fetchLists = useListsStore((s) => s.fetchLists);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  return null;
}

"use client";

import { useEffect } from "react";
import { useUserStore } from "../store/user.store";

export function UserInitializer() {
  const fetchAll = useUserStore((s) => s.fetchAll);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return null;
}

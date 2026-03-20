"use client";

import { useEffect } from "react";
import { useGoogleStore } from "../store/google.store";

export function GoogleInitializer() {
  const fetchStatus = useGoogleStore((s) => s.fetchStatus);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return null;
}

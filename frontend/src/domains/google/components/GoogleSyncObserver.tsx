"use client";

import { useEffect, useRef } from "react";
import { useGoogleStore } from "../store/google.store";
import { useTasksStore } from "@modules/tasks/store/tasks.store";

/**
 * Watches for Google Calendar sync completions and reactively
 * refreshes the tasks store. This avoids circular store dependencies
 * by keeping the cross-store coordination in a React component.
 */
export function GoogleSyncObserver() {
	const lastSyncAt = useGoogleStore((s) => s.lastSyncAt);
	const fetchTasks = useTasksStore((s) => s.fetchTasks);
	const prevSyncAtRef = useRef<string | null>(lastSyncAt);

	useEffect(() => {
		if (lastSyncAt === prevSyncAtRef.current) return;
		prevSyncAtRef.current = lastSyncAt;

		if (lastSyncAt !== null) {
			void fetchTasks();
		}
	}, [lastSyncAt, fetchTasks]);

	return null;
}

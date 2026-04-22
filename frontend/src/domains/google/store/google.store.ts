"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { getGoogleStatus, syncGoogle, disconnectGoogle } from "../api/google.api";
import type { GoogleStatus, GoogleSyncResult } from "../types/google.types";

interface GoogleState {
	isConnected: boolean;
	calendarId: string | null;
	lastSyncAt: string | null;
	isSyncing: boolean;
	fetchStatus: () => Promise<void>;
	sync: () => Promise<GoogleSyncResult | null>;
	syncSilent: () => void;
	disconnect: () => Promise<void>;
}

export const useGoogleStore = create<GoogleState>((set) => ({
	isConnected: false,
	calendarId: null,
	lastSyncAt: null,
	isSyncing: false,

	fetchStatus: async () => {
		try {
			const status = await getGoogleStatus();
			set({
				isConnected: status.isConnected,
				calendarId: status.calendarId,
				lastSyncAt: status.lastSyncAt,
			});
		} catch {}
	},

	sync: async () => {
		set({ isSyncing: true });
		try {
			const result = await syncGoogle();
			set({ isSyncing: false, lastSyncAt: new Date().toISOString() });
			toast.success(result.message);
			return result;
		} catch {
			set({ isSyncing: false });
			toast.error("Не удалось синхронизировать Google Calendar");
			return null;
		}
	},

	syncSilent: () => {
		syncGoogle()
			.then(() => {
				set({ lastSyncAt: new Date().toISOString() });
			})
			.catch(() => {});
	},

	disconnect: async () => {
		try {
			await disconnectGoogle();
			set({ isConnected: false, calendarId: null, lastSyncAt: null });
		} catch {}
	},
}));

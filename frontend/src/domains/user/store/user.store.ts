"use client";

import { create } from "zustand";
import { getMe, getSettings, updateSettings } from "../api/user.api";
import type { UserProfile, UserSettings, UpdateUserSettingsRequest } from "../types/user.types";

interface UserState {
	profile: UserProfile | null;
	settings: UserSettings | null;
	isLoading: boolean;
	fetchError: string | null;
	fetchAll: () => Promise<void>;
	updateSettings: (data: UpdateUserSettingsRequest) => Promise<UserSettings | null>;
}

export const useUserStore = create<UserState>((set) => ({
	profile: null,
	settings: null,
	isLoading: false,
	fetchError: null,

	fetchAll: async () => {
		set({ isLoading: true });

		try {
			const [profile, settings] = await Promise.all([getMe(), getSettings()]);
			set({ profile, settings, isLoading: false, fetchError: null });
		} catch {
			set({ isLoading: false, fetchError: "Не удалось загрузить данные пользователя" });
		}
	},

	updateSettings: async (data: UpdateUserSettingsRequest) => {
		try {
			const updated = await updateSettings(data);
			set({ settings: updated });
			return updated;
		} catch {
			return null;
		}
	},
}));

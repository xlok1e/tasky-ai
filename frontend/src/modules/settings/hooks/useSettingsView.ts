"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@domains/auth/store/auth.store";
import { getGoogleAuthUrl } from "@/domains/google/api/google.api";
import { useGoogleStore } from "@/domains/google/store/google.store";
import { useUserStore } from "@/domains/user/store/user.store";
import type { UpdateUserSettingsRequest } from "@/domains/user/types/user.types";
import {
	DEFAULT_SETTINGS_VALUES,
	TIMEZONE_OPTIONS,
	type TimeZoneOption,
} from "../constants/settings.constants";

function toInputTime(value: string | undefined, fallback: string) {
	return value?.slice(0, 5) ?? fallback;
}

function toApiTime(value: string) {
	if (!value) return value;
	return value.length === 5 ? `${value}:00` : value;
}

export function useSettingsView() {
	const router = useRouter();
	const { user, clearToken } = useAuthStore();
	const { profile, settings, updateSettings } = useUserStore();
	const { isConnected } = useGoogleStore();

	const [workDayStart, setWorkDayStart] = useState(DEFAULT_SETTINGS_VALUES.workDayStart);
	const [workDayEnd, setWorkDayEnd] = useState(DEFAULT_SETTINGS_VALUES.workDayEnd);
	const [timeZone, setTimeZone] = useState(DEFAULT_SETTINGS_VALUES.timeZone);
	const [morningEnabled, setMorningEnabled] = useState(false);
	const [eveningEnabled, setEveningEnabled] = useState(false);
	const [morningNotificationTime, setMorningNotificationTime] = useState(
		DEFAULT_SETTINGS_VALUES.morningNotificationTime,
	);
	const [eveningNotificationTime, setEveningNotificationTime] = useState(
		DEFAULT_SETTINGS_VALUES.eveningNotificationTime,
	);
	const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);

	const timezoneOptions = useMemo<TimeZoneOption[]>(() => {
		if (!timeZone) return TIMEZONE_OPTIONS;
		if (TIMEZONE_OPTIONS.some((option) => option.value === timeZone)) return TIMEZONE_OPTIONS;

		return [{ value: timeZone, label: timeZone }, ...TIMEZONE_OPTIONS];
	}, [timeZone]);

	useEffect(() => {
		if (!settings) return;

		setWorkDayStart(toInputTime(settings.workDayStart, DEFAULT_SETTINGS_VALUES.workDayStart));
		setWorkDayEnd(toInputTime(settings.workDayEnd, DEFAULT_SETTINGS_VALUES.workDayEnd));
		setTimeZone(settings.timeZone ?? DEFAULT_SETTINGS_VALUES.timeZone);
		setMorningEnabled(settings.morningNotificationsEnabled ?? false);
		setEveningEnabled(settings.eveningNotificationsEnabled ?? false);
		setMorningNotificationTime(
			toInputTime(
				settings.morningNotificationTime,
				DEFAULT_SETTINGS_VALUES.morningNotificationTime,
			),
		);
		setEveningNotificationTime(
			toInputTime(
				settings.eveningNotificationTime,
				DEFAULT_SETTINGS_VALUES.eveningNotificationTime,
			),
		);
	}, [settings]);

	const persistSettings = async (patch: UpdateUserSettingsRequest) => {
		const updated = await updateSettings(patch);
		if (!updated) {
			toast.error("Не удалось сохранить настройки");
			return;
		}
	};

	const handleTimeZoneChange = async (value: string) => {
		setTimeZone(value);
		await persistSettings({ timeZone: value });
	};

	const handleWorkDayStartBlur = async () => {
		await persistSettings({ workDayStart: toApiTime(workDayStart) });
	};

	const handleWorkDayEndBlur = async () => {
		await persistSettings({ workDayEnd: toApiTime(workDayEnd) });
	};

	const handleMorningToggle = async (value: boolean) => {
		setMorningEnabled(value);
		await persistSettings({ morningNotificationsEnabled: value });
	};

	const handleEveningToggle = async (value: boolean) => {
		setEveningEnabled(value);
		await persistSettings({ eveningNotificationsEnabled: value });
	};

	const handleMorningTimeBlur = async () => {
		await persistSettings({ morningNotificationTime: toApiTime(morningNotificationTime) });
	};

	const handleEveningTimeBlur = async () => {
		await persistSettings({ eveningNotificationTime: toApiTime(eveningNotificationTime) });
	};

	const handleGoogleAction = async () => {
		setIsGoogleAuthLoading(true);
		try {
			const authUrl = await getGoogleAuthUrl(window.location.href);
			window.location.href = authUrl;
		} catch {
			toast.error("Не удалось начать авторизацию Google");
			setIsGoogleAuthLoading(false);
		}
	};

	const handleLogout = () => {
		clearToken();
		router.replace("/login");
	};

	const username = profile?.telegramUsername
		? `@${profile.telegramUsername}`
		: user?.username
			? `@${user.username}`
			: "@user";

	const phoneNumber = profile?.phoneNumber ?? "+7 *** *** 00 00";

	return {
		workDayStart,
		workDayEnd,
		timeZone,
		morningEnabled,
		eveningEnabled,
		morningNotificationTime,
		eveningNotificationTime,
		timezoneOptions,
		isConnected,
		isGoogleAuthLoading,
		username,
		phoneNumber,
		setWorkDayStart,
		setWorkDayEnd,
		setMorningNotificationTime,
		setEveningNotificationTime,
		handleWorkDayStartBlur,
		handleWorkDayEndBlur,
		handleTimeZoneChange,
		handleMorningToggle,
		handleEveningToggle,
		handleMorningTimeBlur,
		handleEveningTimeBlur,
		handleGoogleAction,
		handleLogout,
	};
}

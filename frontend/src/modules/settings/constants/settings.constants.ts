export type ThemeMode = "light" | "system" | "dark";

export interface ThemeModeOption {
	value: ThemeMode;
	label: string;
}

export type { TimeZoneOption } from "@shared/config/timezone.constants";
export { TIMEZONE_OPTIONS } from "@shared/config/timezone.constants";

export const THEME_MODE_OPTIONS: ThemeModeOption[] = [
	{ value: "light", label: "Светлая тема" },
	{ value: "system", label: "Системная тема" },
	{ value: "dark", label: "Темная тема" },
];

export const DEFAULT_SETTINGS_VALUES = {
	workDayStart: "09:00",
	workDayEnd: "19:00",
	timeZone: "Europe/Moscow",
	morningNotificationTime: "09:00",
	eveningNotificationTime: "19:00",
};

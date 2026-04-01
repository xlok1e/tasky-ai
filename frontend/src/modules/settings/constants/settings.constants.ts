export type ThemeMode = "light" | "system" | "dark";

export interface ThemeModeOption {
	value: ThemeMode;
	label: string;
}

export interface TimeZoneOption {
	value: string;
	label: string;
}

export const THEME_MODE_OPTIONS: ThemeModeOption[] = [
	{ value: "light", label: "Светлая тема" },
	{ value: "system", label: "Системная тема" },
	{ value: "dark", label: "Темная тема" },
];

export const TIMEZONE_OPTIONS: TimeZoneOption[] = [
	{ value: "Europe/Moscow", label: "UTC +3 (Москва)" },
	{ value: "Europe/Kaliningrad", label: "UTC +2 (Калининград)" },
	{ value: "Asia/Yekaterinburg", label: "UTC +5 (Екатеринбург)" },
	{ value: "Asia/Novosibirsk", label: "UTC +7 (Новосибирск)" },
	{ value: "Asia/Irkutsk", label: "UTC +8 (Иркутск)" },
	{ value: "Asia/Vladivostok", label: "UTC +10 (Владивосток)" },
	{ value: "UTC", label: "UTC +0 (Лондон)" },
];

export const DEFAULT_SETTINGS_VALUES = {
	workDayStart: "09:00",
	workDayEnd: "19:00",
	timeZone: "Europe/Moscow",
	morningNotificationTime: "09:00",
	eveningNotificationTime: "19:00",
};

import type { OnboardingStep } from "../types/onboarding.types";

export const DEFAULT_TIME_ZONE = "Europe/Moscow";
export const DEFAULT_WORK_DAY_START = "09:00";
export const DEFAULT_WORK_DAY_END = "18:00";
export const TOTAL_ONBOARDING_STEPS = 4;

export const ONBOARDING_TIMEZONES = [
	"Europe/Moscow",
	"Europe/Kiev",
	"Europe/Minsk",
	"Europe/Kaliningrad",
	"Asia/Yekaterinburg",
	"Asia/Omsk",
	"Asia/Novosibirsk",
	"Asia/Irkutsk",
	"Asia/Yakutsk",
	"Asia/Vladivostok",
	"Asia/Sakhalin",
	"Asia/Kamchatka",
	"Europe/London",
	"Europe/Paris",
	"Europe/Berlin",
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Los_Angeles",
	"UTC",
] as const;

export const ONBOARDING_STEP_NUMBER: Record<OnboardingStep, number> = {
	calendar: 2,
	"google-connect": 2,
	"google-success": 2,
	"work-time": 3,
	notifications: 4,
};

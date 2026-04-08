import { TIMEZONE_OPTIONS } from "@shared/config/timezone.constants";
import type { OnboardingStep } from "../types/onboarding.types";

export { TIMEZONE_OPTIONS };
export const DEFAULT_TIME_ZONE = "Europe/Moscow";
export const DEFAULT_WORK_DAY_START = "09:00";
export const DEFAULT_WORK_DAY_END = "18:00";
export const TOTAL_ONBOARDING_STEPS = 4;

export const ONBOARDING_STEP_NUMBER: Record<OnboardingStep, number> = {
	calendar: 2,
	"google-connect": 2,
	"google-success": 2,
	"work-time": 3,
	notifications: 4,
};

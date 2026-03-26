"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getGoogleAuthUrl } from "@domains/google/api/google.api";
import { useGoogleStore } from "@domains/google/store/google.store";
import { useUserStore } from "@domains/user/store/user.store";
import { getSettings } from "@domains/user/api/user.api";
import {
	DEFAULT_TIME_ZONE,
	DEFAULT_WORK_DAY_END,
	DEFAULT_WORK_DAY_START,
	ONBOARDING_STEP_NUMBER,
	TOTAL_ONBOARDING_STEPS,
} from "../constants/onboarding.constants";
import type { CalendarChoice, OnboardingStep } from "../types/onboarding.types";

const TIME_VALUE_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isCalendarChoice(value: string): value is CalendarChoice {
	return value === "builtin" || value === "google";
}

function isValidTimeValue(value: string): boolean {
	return TIME_VALUE_PATTERN.test(value);
}

function toApiTimeValue(value: string): string {
	return `${value}:00`;
}

function stripTimeSeconds(time: string): string {
	return time.substring(0, 5);
}

export function useOnboardingView() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const disconnectGoogle = useGoogleStore((state) => state.disconnect);
	const syncGoogleCalendar = useGoogleStore((state) => state.sync);
	const updateSettings = useUserStore((state) => state.updateSettings);

	const [step, setStep] = useState<OnboardingStep>("calendar");
	const [calendarChoice, setCalendarChoice] = useState<CalendarChoice>("builtin");
	const [workDayStart, setWorkDayStart] = useState(DEFAULT_WORK_DAY_START);
	const [workDayEnd, setWorkDayEnd] = useState(DEFAULT_WORK_DAY_END);
	const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
	const [morningEnabled, setMorningEnabled] = useState(true);
	const [eveningEnabled, setEveningEnabled] = useState(true);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (searchParams.get("step") === "google-success") {
			setCalendarChoice("google");
			setStep("google-success");
			window.history.replaceState({}, "", "/onboarding");
		}
	}, [searchParams]);

	useEffect(() => {
		const loadExistingSettings = async () => {
			try {
				const settings = await getSettings();

				if (settings.onboardingCompleted === true) {
					router.replace("/inbox");
					return;
				}

				setWorkDayStart(stripTimeSeconds(settings.workDayStart));
				setWorkDayEnd(stripTimeSeconds(settings.workDayEnd));
				setTimeZone(settings.timeZone);
				setMorningEnabled(settings.morningNotificationsEnabled);
				setEveningEnabled(settings.eveningNotificationsEnabled);

				if (!settings.useBuiltinCalendar) {
					setCalendarChoice("google");
				}
			} catch {
				// Silently use defaults already set in useState
			}
		};

		loadExistingSettings();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const stepLabel = useMemo(() => {
		const currentStepNumber = ONBOARDING_STEP_NUMBER[step];
		return `Шаг ${currentStepNumber} из ${TOTAL_ONBOARDING_STEPS}`;
	}, [step]);

	const isWorkTimeComplete =
		isValidTimeValue(workDayStart) &&
		isValidTimeValue(workDayEnd) &&
		workDayStart < workDayEnd &&
		timeZone.length > 0;

	const handleCalendarChoiceChange = (value: string) => {
		if (!isCalendarChoice(value)) {
			toast.error("Не удалось выбрать тип календаря");
			return;
		}

		setCalendarChoice(value);
	};

	const handleCalendarContinue = async () => {
		if (calendarChoice === "google") {
			setStep("google-connect");
			return;
		}

		setIsLoading(true);
		const updatedSettings = await updateSettings({ useBuiltinCalendar: true });
		setIsLoading(false);

		if (!updatedSettings) {
			toast.error("Не удалось сохранить выбор календаря");
			return;
		}

		setStep("work-time");
	};

	const handleConnectGoogle = async () => {
		setIsLoading(true);

		try {
			const redirectUri = `${window.location.origin}/onboarding?step=google-success`;
			const authUrl = await getGoogleAuthUrl(redirectUri);
			window.location.assign(authUrl);
		} catch {
			setIsLoading(false);
			toast.error("Не удалось открыть авторизацию Google");
		}
	};

	const handleGoogleBack = () => {
		setStep("calendar");
	};

	const handleGoogleSuccessCancel = async () => {
		setIsLoading(true);
		await disconnectGoogle();

		const updatedSettings = await updateSettings({ useBuiltinCalendar: true });
		setIsLoading(false);

		if (!updatedSettings) {
			toast.error("Не удалось вернуться к встроенному календарю");
			return;
		}

		setCalendarChoice("builtin");
		setStep("calendar");
	};

	const handleGoogleSuccessContinue = () => {
		setStep("work-time");
	};

	const handleWorkTimeBack = () => {
		setStep(calendarChoice === "google" ? "google-success" : "calendar");
	};

	const handleWorkTimeContinue = async () => {
		if (!isWorkTimeComplete) {
			toast.error("Проверьте рабочее время и часовой пояс");
			return;
		}

		setIsLoading(true);
		const updatedSettings = await updateSettings({
			workDayStart: toApiTimeValue(workDayStart),
			workDayEnd: toApiTimeValue(workDayEnd),
			timeZone,
		});
		setIsLoading(false);

		if (!updatedSettings) {
			toast.error("Не удалось сохранить рабочее время");
			return;
		}

		setStep("notifications");
	};

	const handleNotificationsBack = () => {
		setStep("work-time");
	};

	const handleFinish = async () => {
		setIsLoading(true);
		const updatedSettings = await updateSettings({
			morningNotificationsEnabled: morningEnabled,
			eveningNotificationsEnabled: eveningEnabled,
			onboardingCompleted: true,
		});
		setIsLoading(false);

		if (!updatedSettings) {
			toast.error("Не удалось завершить настройку");
			return;
		}

		if (calendarChoice === "google") {
			void syncGoogleCalendar();
		}

		router.replace("/inbox");
	};

	return {
		calendarChoice,
		eveningEnabled,
		handleCalendarChoiceChange,
		handleCalendarContinue,
		handleConnectGoogle,
		handleFinish,
		handleGoogleBack,
		handleGoogleSuccessCancel,
		handleGoogleSuccessContinue,
		handleNotificationsBack,
		handleWorkTimeBack,
		handleWorkTimeContinue,
		isLoading,
		isWorkTimeComplete,
		morningEnabled,
		setEveningEnabled,
		setMorningEnabled,
		setTimeZone,
		setWorkDayEnd,
		setWorkDayStart,
		step,
		stepLabel,
		timeZone,
		workDayEnd,
		workDayStart,
	};
}

"use client";

import { CalendarStep } from "./steps/CalendarStep";
import { GoogleConnectStep } from "./steps/GoogleConnectStep";
import { GoogleSuccessStep } from "./steps/GoogleSuccessStep";
import { NotificationsStep } from "./steps/NotificationsStep";
import { WorkTimeStep } from "./steps/WorkTimeStep";
import { useOnboardingView } from "../hooks/useOnboardingView";

export function OnboardingView() {
	const onboardingView = useOnboardingView();

	switch (onboardingView.step) {
		case "calendar":
			return (
				<CalendarStep
					calendarChoice={onboardingView.calendarChoice}
					isLoading={onboardingView.isLoading}
					onCalendarChoiceChange={onboardingView.handleCalendarChoiceChange}
					onContinue={onboardingView.handleCalendarContinue}
					stepLabel={onboardingView.stepLabel}
				/>
			);

		case "google-connect":
			return (
				<GoogleConnectStep
					isLoading={onboardingView.isLoading}
					onBack={onboardingView.handleGoogleBack}
					onConnect={onboardingView.handleConnectGoogle}
					stepLabel={onboardingView.stepLabel}
				/>
			);

		case "google-success":
			return (
				<GoogleSuccessStep
					isLoading={onboardingView.isLoading}
					onCancel={onboardingView.handleGoogleSuccessCancel}
					onContinue={onboardingView.handleGoogleSuccessContinue}
					stepLabel={onboardingView.stepLabel}
				/>
			);

		case "work-time":
			return (
				<WorkTimeStep
					isLoading={onboardingView.isLoading}
					isWorkTimeComplete={onboardingView.isWorkTimeComplete}
					onBack={onboardingView.handleWorkTimeBack}
					onContinue={onboardingView.handleWorkTimeContinue}
					onTimeZoneChange={onboardingView.setTimeZone}
					onWorkDayEndChange={onboardingView.setWorkDayEnd}
					onWorkDayStartChange={onboardingView.setWorkDayStart}
					stepLabel={onboardingView.stepLabel}
					timeZone={onboardingView.timeZone}
					workDayEnd={onboardingView.workDayEnd}
					workDayStart={onboardingView.workDayStart}
				/>
			);

		case "notifications":
			return (
				<NotificationsStep
					eveningEnabled={onboardingView.eveningEnabled}
					isLoading={onboardingView.isLoading}
					morningEnabled={onboardingView.morningEnabled}
					onBack={onboardingView.handleNotificationsBack}
					onEveningEnabledChange={onboardingView.setEveningEnabled}
					onFinish={onboardingView.handleFinish}
					onMorningEnabledChange={onboardingView.setMorningEnabled}
					stepLabel={onboardingView.stepLabel}
				/>
			);

		default:
			return null;
	}
}

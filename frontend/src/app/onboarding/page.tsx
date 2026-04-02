import { Suspense } from "react";
import { OnboardingView } from "@modules/onboarding";

export default function OnboardingPage() {
	return (
		<Suspense>
			<OnboardingView />
		</Suspense>
	);
}

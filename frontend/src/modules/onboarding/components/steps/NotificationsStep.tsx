import { Button } from "@shared/ui/button";
import { authFlowButtonVariants } from "@modules/auth-flow/lib/auth-flow-button.styles";
import { cn } from "@shared/lib/utils";
import { OnboardingNotificationCard } from "../OnboardingNotificationCard";
import { OnboardingShell } from "../OnboardingShell";

interface NotificationsStepProps {
	eveningEnabled: boolean;
	isLoading: boolean;
	morningEnabled: boolean;
	onBack: () => void;
	onEveningEnabledChange: (value: boolean) => void;
	onFinish: () => Promise<void>;
	onMorningEnabledChange: (value: boolean) => void;
	stepLabel: string;
}

export function NotificationsStep({
	eveningEnabled,
	isLoading,
	morningEnabled,
	onBack,
	onEveningEnabledChange,
	onFinish,
	onMorningEnabledChange,
	stepLabel,
}: NotificationsStepProps) {
	return (
		<OnboardingShell
			title="Настройка уведомлений"
			description="Настройте уведомления от Telegram бота."
			stepLabel={stepLabel}
			actions={
				<div className="grid gap-3 sm:grid-cols-2">
					<Button
						type="button"
						onClick={onBack}
						disabled={isLoading}
						className={cn(authFlowButtonVariants({ tone: "muted" }), "w-full")}
					>
						Назад
					</Button>
					<Button
						type="button"
						onClick={onFinish}
						disabled={isLoading}
						className={cn(authFlowButtonVariants({ tone: "secondary" }), "w-full")}
					>
						{isLoading ? "Сохранение..." : "Завершить"}
					</Button>
				</div>
			}
		>
			<div className="space-y-6 px-6 py-3">
				<OnboardingNotificationCard
					checked={morningEnabled}
					className="w-full"
					onCheckedChange={onMorningEnabledChange}
					label="Утренние уведомления"
					description="Напоминания о задачах на день"
					time="09:00"
				/>
				<OnboardingNotificationCard
					checked={eveningEnabled}
					className="w-full"
					onCheckedChange={onEveningEnabledChange}
					label="Вечерние уведомления"
					description="Итоги дня"
					time="19:00"
				/>
			</div>
		</OnboardingShell>
	);
}

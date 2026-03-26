import { Button } from "@shared/ui/button";
import { authFlowButtonVariants } from "@modules/auth-flow/lib/auth-flow-button.styles";
import { cn } from "@shared/lib/utils";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/select";
import { ONBOARDING_TIMEZONES } from "../../constants/onboarding.constants";
import { OnboardingShell } from "../OnboardingShell";

interface WorkTimeStepProps {
	isLoading: boolean;
	isWorkTimeComplete: boolean;
	onBack: () => void;
	onContinue: () => Promise<void>;
	onTimeZoneChange: (value: string) => void;
	onWorkDayEndChange: (value: string) => void;
	onWorkDayStartChange: (value: string) => void;
	stepLabel: string;
	timeZone: string;
	workDayEnd: string;
	workDayStart: string;
}

export function WorkTimeStep({
	isLoading,
	isWorkTimeComplete,
	onBack,
	onContinue,
	onTimeZoneChange,
	onWorkDayEndChange,
	onWorkDayStartChange,
	stepLabel,
	timeZone,
	workDayEnd,
	workDayStart,
}: WorkTimeStepProps) {
	return (
		<OnboardingShell
			title="Настройка рабочего времени"
			description="Укажите ваш рабочий часовой пояс и границы рабочего дня."
			stepLabel={stepLabel}
			actions={
				<div className="grid gap-3 sm:grid-cols-2">
					<Button
						type="button"
						variant="outline"
						onClick={onBack}
						disabled={isLoading}
						className={cn(authFlowButtonVariants({ tone: "outline" }), "w-full")}
					>
						Назад
					</Button>
					<Button
						type="button"
						onClick={onContinue}
						disabled={isLoading || !isWorkTimeComplete}
						className={cn(authFlowButtonVariants({ tone: "primary" }), "w-full")}
					>
						{isLoading ? "Сохранение..." : "Далее"}
					</Button>
				</div>
			}
		>
			<div className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="onboarding-work-start">Начало рабочего дня</Label>
						<Input
							id="onboarding-work-start"
							type="time"
							value={workDayStart}
							onChange={(event) => onWorkDayStartChange(event.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="onboarding-work-end">Конец рабочего дня</Label>
						<Input
							id="onboarding-work-end"
							type="time"
							value={workDayEnd}
							onChange={(event) => onWorkDayEndChange(event.target.value)}
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="onboarding-time-zone">Часовой пояс</Label>
					<Select value={timeZone} onValueChange={onTimeZoneChange}>
						<SelectTrigger id="onboarding-time-zone" className="w-full">
							<SelectValue placeholder="Выберите часовой пояс" />
						</SelectTrigger>
						<SelectContent>
							{ONBOARDING_TIMEZONES.map((timezoneOption) => (
								<SelectItem key={timezoneOption} value={timezoneOption}>
									{timezoneOption}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</OnboardingShell>
	);
}

import { Checkbox } from "@shared/ui/checkbox";
import { Button } from "@shared/ui/button";
import { authFlowButtonVariants } from "@modules/auth-flow/lib/auth-flow-button.styles";
import { cn } from "@shared/lib/utils";
import type { CalendarChoice } from "../../types/onboarding.types";
import { OnboardingShell } from "../OnboardingShell";

interface CalendarStepProps {
	calendarChoice: CalendarChoice;
	isLoading: boolean;
	onCalendarChoiceChange: (value: string) => void;
	onContinue: () => Promise<void>;
	stepLabel: string;
}

interface CalendarOptionProps {
	description: string;
	isChecked: boolean;
	onSelect: () => void;
	title: string;
}

function CalendarOption({ description, isChecked, onSelect, title }: CalendarOptionProps) {
	return (
		<label className="flex cursor-pointer items-center gap-3 py-3 pr-6" onClick={onSelect}>
			<Checkbox
				checked={isChecked}
				onCheckedChange={onSelect}
				aria-label={title}
				className={cn(
					"size-7 rounded-[4px] border-[#e5d2bb] bg-[#f7f7f7] shadow-none",
					"data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
				)}
			/>

			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<p className="text-[20px] leading-6 font-normal text-black dark:text-foreground">{title}</p>
				<p className="text-[18px] leading-[1.3] font-normal text-[#616161] dark:text-muted-foreground">
					{description}
				</p>
			</div>
		</label>
	);
}

export function CalendarStep({
	calendarChoice,
	isLoading,
	onCalendarChoiceChange,
	onContinue,
	stepLabel,
}: CalendarStepProps) {
	return (
		<OnboardingShell
			title="Выбор календаря"
			description="Выберите, какой календарь использовать для планирования задач."
			stepLabel={stepLabel}
			actions={
				<Button
					onClick={onContinue}
					disabled={isLoading}
					className={cn(
						authFlowButtonVariants({ tone: "primary" }),
						"mt-5 w-full px-4 sm:w-auto sm:min-w-[132px]",
					)}
				>
					{isLoading ? "Сохранение..." : "Далее"}
				</Button>
			}
		>
			<div className="space-y-[18px]">
				<CalendarOption
					isChecked={calendarChoice === "builtin"}
					onSelect={() => onCalendarChoiceChange("builtin")}
					title="Встроенный календарь"
					description="Используйте наш календарь без внешних интеграций."
				/>
				<CalendarOption
					isChecked={calendarChoice === "google"}
					onSelect={() => onCalendarChoiceChange("google")}
					title="Google календарь"
					description="Синхронизация с вашим Google календарем."
				/>
			</div>
		</OnboardingShell>
	);
}

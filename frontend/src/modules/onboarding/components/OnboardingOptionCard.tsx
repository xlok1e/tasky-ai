import type { ReactNode } from "react";
import { RadioGroupItem } from "@shared/ui/radio-group";
import { cn } from "@shared/lib/utils";

interface OnboardingOptionCardProps {
	description: string;
	icon?: ReactNode;
	id: string;
	isChecked: boolean;
	title: string;
	value: string;
}

export function OnboardingOptionCard({
	description,
	icon,
	id,
	isChecked,
	title,
	value,
}: OnboardingOptionCardProps) {
	return (
		<label
			htmlFor={id}
			className={cn(
				"flex cursor-pointer items-start gap-4 rounded-2xl border px-4 py-4 transition-colors",
				isChecked
					? "border-primary/50 bg-primary/6 shadow-sm"
					: "border-border/70 bg-background/70 hover:bg-accent/30",
			)}
		>
			<RadioGroupItem id={id} value={value} className="mt-1" />

			<div className="flex flex-1 items-start gap-3">
				{icon ? (
					<div className="mt-0.5 rounded-xl bg-secondary/70 p-2 text-primary">
						{icon}
					</div>
				) : null}

				<div className="space-y-1">
					<p className="text-sm font-medium text-foreground sm:text-base">{title}</p>
					<p className="text-sm leading-5 text-muted-foreground">{description}</p>
				</div>
			</div>
		</label>
	);
}

import { Switch } from "@shared/ui/switch";
import { cn } from "@shared/lib/utils";

interface OnboardingNotificationCardProps {
	checked: boolean;
	className?: string;
	description: string;
	label: string;
	onCheckedChange: (value: boolean) => void;
	time: string;
}

export function OnboardingNotificationCard({
	checked,
	className,
	description,
	label,
	onCheckedChange,
	time,
}: OnboardingNotificationCardProps) {
	return (
		<div className={cn("flex items-center gap-[18px]", className)}>
			<Switch
				aria-label={label}
				checked={checked}
				onCheckedChange={onCheckedChange}
				className="h-6 w-11 data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary/20"
			/>

			<div className="min-w-0 flex-1 space-y-1">
				<p className="text-[20px] leading-6 font-normal text-foreground">{label}</p>
				<p className="text-[18px] leading-6 font-normal text-muted-foreground">
					{description}
				</p>
			</div>

			<div className="flex h-full w-[100px] items-center justify-end py-2">
				<span className="text-[18px] leading-6 font-normal text-muted-foreground">
					{time}
				</span>
			</div>
		</div>
	);
}

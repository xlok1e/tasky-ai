import { cn } from "@shared/lib/utils";

interface SettingsInfoRowProps {
	label: string;
	value: string;
	valueMuted?: boolean;
}

export function SettingsInfoRow({ label, value, valueMuted = true }: SettingsInfoRowProps) {
	return (
		<div className="flex w-full items-center justify-between gap-4">
			<p className="text-[18px] leading-6 font-normal text-foreground">{label}</p>
			<p
				className={cn(
					"text-[18px] leading-6 text-right font-normal",
					valueMuted ? "text-muted-foreground" : "text-foreground",
				)}
			>
				{value}
			</p>
		</div>
	);
}

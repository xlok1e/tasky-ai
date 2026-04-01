import type { ReactNode } from "react";

interface SettingsFieldProps {
	label: string;
	children: ReactNode;
}

export function SettingsField({ label, children }: SettingsFieldProps) {
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-[10px]">
			<label className="text-[18px] leading-5 font-normal text-foreground">{label}</label>
			{children}
		</div>
	);
}

import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";

interface SettingsSectionProps {
	title: string;
	children: ReactNode;
	className?: string;
	contentClassName?: string;
}

export function SettingsSection({
	title,
	children,
	className,
	contentClassName,
}: SettingsSectionProps) {
	return (
		<section className={cn("flex w-full flex-col gap-[18px]", className)}>
			<h2 className="text-[22px] leading-6 font-normal text-foreground">{title}</h2>
			<div className={cn("flex w-full flex-col gap-[18px]", contentClassName)}>{children}</div>
		</section>
	);
}

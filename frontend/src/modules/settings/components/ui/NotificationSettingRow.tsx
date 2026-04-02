"use client";

import { Input } from "@shared/ui/input";
import { Switch } from "@shared/ui/switch";

interface NotificationSettingRowProps {
	switchId: string;
	title: string;
	description: string;
	enabled: boolean;
	time: string;
	onToggle: (value: boolean) => void;
	onTimeChange: (value: string) => void;
	onTimeBlur: () => void;
}

export function NotificationSettingRow({
	switchId,
	title,
	description,
	enabled,
	time,
	onToggle,
	onTimeChange,
	onTimeBlur,
}: NotificationSettingRowProps) {
	return (
		<div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<div className="flex flex-col gap-[6px]">
				<div className="flex items-center gap-2">
					<Switch id={switchId} checked={enabled} onCheckedChange={onToggle} />
					<label
						htmlFor={switchId}
						className="cursor-pointer text-[18px] leading-[0.8] font-normal text-foreground"
					>
						{title}
					</label>
				</div>
				<p className="pl-[52px] text-[18px] leading-6 font-normal text-muted-foreground">
					{description}
				</p>
			</div>

			<Input
				type="time"
				value={time}
				onChange={(event) => onTimeChange(event.target.value)}
				onBlur={onTimeBlur}
				className="h-[42px] w-[108px] rounded-md border-border bg-card px-3 py-2 text-center text-[18px] md:text-[18px] leading-6 text-foreground shadow-none focus-visible:ring-0 [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit]:text-[18px] [&::-webkit-datetime-edit]:leading-6 [&::-webkit-datetime-edit]:text-center [&::-webkit-date-and-time-value]:text-center"
			/>
		</div>
	);
}

import { CalendarDays, ChartNoAxesCombined, Inbox, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SidebarItem {
	id: string;
	label: string;
	icon: LucideIcon;
	href: string;
	disabled?: boolean;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
	{
		id: "calendar",
		label: "Календарь",
		icon: CalendarDays,
		href: "/calendar",
	},
	{
		id: "inbox",
		label: "Входящие задаи",
		icon: Inbox,
		href: "/inbox",
	},
	{
		id: "statistics",
		label: "Статистика",
		icon: ChartNoAxesCombined,
		href: "/statistics",
		disabled: true,
	},
];

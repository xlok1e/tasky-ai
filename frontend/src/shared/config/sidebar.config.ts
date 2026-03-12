import { CalendarDays, Inbox, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SidebarItem {
	id: string;
	label: string;
	icon: LucideIcon;
	href: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
	{
		id: "inbox",
		label: "Входящие",
		icon: Inbox,
		href: "/inbox",
	},
	{
		id: "calendar",
		label: "Календарь",
		icon: CalendarDays,
		href: "/calendar",
	},
	{
		id: "settings",
		label: "Настройки",
		icon: Settings,
		href: "/settings",
	},
];

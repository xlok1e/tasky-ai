"use client";

import Link from "next/link";
import { cn } from "@shared/lib/utils";
import type { SidebarItem as SidebarItemType } from "@shared/config/sidebar.config";

interface SidebarItemProps {
	item: SidebarItemType;
	isActive: boolean;
	isCollapsed: boolean;
}

export function SidebarItem({ item, isActive, isCollapsed }: SidebarItemProps) {
	const Icon = item.icon;

	return (
		<Link
			href={item.href}
			className={cn(
				"flex items-center rounded-[6px] transition-colors overflow-hidden",
				isCollapsed ? "w-[40px] h-[40px] justify-center" : "gap-2 w-full px-2.5 py-1 text-[18px]",
				isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
			)}
		>
			<Icon size={18} strokeWidth={1.5} className="shrink-0" />
			<span
				className={cn(
					"overflow-hidden whitespace-nowrap transition-all duration-0",
					isCollapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100",
				)}
			>
				{item.label}
			</span>
		</Link>
	);
}

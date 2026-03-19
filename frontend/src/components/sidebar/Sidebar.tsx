"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_ITEMS } from "@shared/config/sidebar.config";
import { SidebarItem } from "./SidebarItem";
import { SidebarListItem } from "./SidebarListItem";
import { useListsStore } from "@modules/lists/store/lists.store";
import {
	CirclePlus,
	LayoutList,
	PanelLeftClose,
	PanelLeftOpen,
	RefreshCcw,
	Send,
	Settings,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { cn } from "@shared/lib/utils";

const EXPANDED_WIDTH = 280;
const COLLAPSED_WIDTH = 68;

const BOTTOM_ITEMS = [
	{ icon: RefreshCcw, label: "Синхронизовать", href: "/" },
	{ icon: Send, label: "Перейти в Telegram", href: "/" },
	{ icon: Settings, label: "Настройки", href: "/settings" },
] as const;

export function Sidebar() {
	const pathname = usePathname();
	const [isCollapsed, setIsCollapsed] = useState(false);
	const lists = useListsStore((s) => s.lists);

	return (
		<aside
			style={{ width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
			className="flex flex-col justify-between h-screen border-r bg-background shrink-0 px-[18px] py-6 transition-[width] duration-150 ease-in-out"
		>
			<div className="flex flex-col">
				<div
					className={cn(
						"flex mb-9 items-center",
						isCollapsed ? "justify-center" : "justify-between",
					)}
				>
					<div
						className={cn(
							"transition-all duration-0",
							isCollapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100",
						)}
					>
						<Link
							href="/inbox"
							className="text-[26px] font-bold tracking-tight text-primary whitespace-nowrap"
						>
							TaskyAI
						</Link>
					</div>

					<Button
						className="w-[40px] h-[40px] rounded-[6px] shrink-0"
						variant="ghost"
						onClick={() => setIsCollapsed((v) => !v)}
					>
						{isCollapsed ? (
							<PanelLeftOpen className="size-[18px]" />
						) : (
							<PanelLeftClose className="size-[18px]" />
						)}
					</Button>
				</div>

				<nav className={cn("flex flex-col gap-2.5", isCollapsed && "items-center")}>
					{SIDEBAR_ITEMS.map((item) => (
						<SidebarItem
							key={item.id}
							item={item}
							isActive={pathname.startsWith(item.href)}
							isCollapsed={isCollapsed}
						/>
					))}
				</nav>

				<div
					className={cn(
						" transition-all duration-0",
						isCollapsed ? "max-h-0 opacity-0" : "max-h-96 opacity-100",
					)}
				>
					<div className="h-px bg-border my-4 -mx-[18px] ml-[1px]" />

					<div className="flex items-center w-full justify-between px-2.5 pr-0 mb-[8px]">
						<div className="flex items-center gap-2">
							<LayoutList className="size-[18px]" strokeWidth={1.5} />
							<label className="text-[18px] cursor-pointer whitespace-nowrap">Списки</label>
						</div>
						<Button className="w-[32px] h-[32px] rounded-[6px]" variant="ghost">
							<CirclePlus className="size-[18px]" strokeWidth={1.5} />
						</Button>
					</div>

					<div className="flex flex-col gap-2.5">
						{lists.map((list) => (
							<SidebarListItem
								key={list.id}
								list={list}
								isActive={pathname === `/lists/${list.id}`}
								isCollapsed={isCollapsed}
							/>
						))}
					</div>
				</div>
			</div>

			<div className={cn("flex flex-col gap-2.5", isCollapsed && "items-center")}>
				{BOTTOM_ITEMS.map(({ icon: Icon, label, href }) => (
					<Link
						key={label}
						href={href}
						className={cn(
							"flex items-center rounded-[6px] transition-colors overflow-hidden hover:bg-accent/50",
							isCollapsed
								? "w-[40px] h-[40px] justify-center"
								: "gap-2 w-full px-2.5 py-1 text-[18px]",
						)}
					>
						<Icon className="size-[18px] shrink-0" strokeWidth={1.5} />
						<span
							className={cn(
								"overflow-hidden whitespace-nowrap transition-all duration-0",
								isCollapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100",
							)}
						>
							{label}
						</span>
					</Link>
				))}
			</div>
		</aside>
	);
}

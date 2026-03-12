"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_ITEMS } from "@shared/config/sidebar.config";
import { SidebarItem } from "./SidebarItem";

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside className="flex h-screen w-56 flex-col border-r bg-background px-3 py-4 shrink-0">
			<div className="mb-6 px-2">
				<Link href="/inbox" className="text-lg font-semibold tracking-tight">
					TaskyAI
				</Link>
			</div>
			<nav className="flex flex-col gap-1">
				{SIDEBAR_ITEMS.map((item) => (
					<SidebarItem key={item.id} item={item} isActive={pathname.startsWith(item.href)} />
				))}
			</nav>
		</aside>
	);
}

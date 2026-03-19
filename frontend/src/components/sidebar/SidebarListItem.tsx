"use client";

import Link from "next/link";
import { EllipsisVertical } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import type { ListResponse } from "@modules/lists/types/list.types";

interface SidebarListItemProps {
	list: ListResponse;
	isActive: boolean;
	isCollapsed: boolean;
}

export function SidebarListItem({ list, isActive, isCollapsed }: SidebarListItemProps) {
	if (isCollapsed) {
		return (
			<Link
				href={`/lists/${list.id}`}
				title={list.name}
				className={cn(
					"flex w-[40px] h-[40px] items-center justify-center rounded-[6px] transition-colors",
					isActive ? "bg-accent text-foreground" : "hover:bg-accent/50",
				)}
			>
				<div
					className="w-[22px] h-[22px] rounded-[4px] shrink-0"
					style={{ backgroundColor: list.colorHex }}
				/>
			</Link>
		);
	}

	return (
		<Link
			href={`/lists/${list.id}`}
			className={cn(
				"flex items-center gap-2 rounded-[6px] px-2.5 py-1 pr-1 transition-colors justify-between  h-[36px]!",
				isActive ? "bg-accent text-foreground" : "hover:bg-accent/50",
			)}
		>
			<div className="flex items-center gap-2 min-w-0">
				<div
					className="w-[22px] h-[22px] rounded-[4px] shrink-0"
					style={{ backgroundColor: list.colorHex }}
				/>
				<span className="text-[18px] box-border whitespace-nowrap overflow-hidden text-ellipsis">
					{list.name}
				</span>
			</div>
			<Button
				asChild={false}
				className="w-[24px]! h-[24px]! rounded-[6px] shrink-0"
				variant="ghost"
				onClick={(e) => e.preventDefault()}
			>
				<EllipsisVertical className="size-[14px]" strokeWidth={2} />
			</Button>
		</Link>
	);
}

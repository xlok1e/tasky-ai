"use client";

import { useState } from "react";
import Link from "next/link";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import type { ListResponse } from "@modules/lists/types/list.types";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/ui/popover";
import { useListsModal } from "@modules/lists/store/lists-modal.store";
import { useDeleteListModal } from "@modules/lists/store/delete-list-modal.store";

interface SidebarListItemProps {
	list: ListResponse;
	isActive: boolean;
	isCollapsed: boolean;
}

export function SidebarListItem({ list, isActive, isCollapsed }: SidebarListItemProps) {
	const [isActionsOpen, setIsActionsOpen] = useState(false);
	const openForEdit = useListsModal((state) => state.openForEdit);
	const openForDelete = useDeleteListModal((state) => state.openForDelete);

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
		<div
			className={cn(
				"flex items-center gap-2 rounded-[6px] px-2.5 py-1 pr-1 transition-colors justify-between h-[36px]!",
				isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/30",
			)}
		>
			<Link href={`/lists/${list.id}`} className="flex min-w-0 flex-1 items-center gap-2">
				<div
					className="w-[22px] h-[22px] rounded-[4px] shrink-0"
					style={{ backgroundColor: list.colorHex }}
				/>
				<span className="text-[18px] box-border whitespace-nowrap overflow-hidden text-ellipsis">
					{list.name}
				</span>
			</Link>
			<Popover open={isActionsOpen} onOpenChange={setIsActionsOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						asChild={false}
						className="w-[24px]! h-[24px]! rounded-[6px] shrink-0"
						variant="ghost"
						onClick={(event) => event.stopPropagation()}
					>
						<EllipsisVertical className="size-[14px]" strokeWidth={2} />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-[220px] p-2">
					<div className="flex flex-col gap-1">
						<Button
							type="button"
							variant="ghost"
							className="w-full justify-start px-3"
							onClick={() => {
								setIsActionsOpen(false);
								openForEdit(list);
							}}
						>
							<Pencil className="size-4" />
							Редактировать
						</Button>
						<Button
							type="button"
							variant="ghost"
							className="w-full justify-start px-3 text-destructive hover:text-destructive"
							onClick={() => {
								setIsActionsOpen(false);
								openForDelete(list);
							}}
						>
							<Trash2 className="size-4" />
							Удалить
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}

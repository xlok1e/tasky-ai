"use client";

import { useState } from "react";
import Link from "next/link";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { useContextMenu } from "@shared/lib/use-context-menu";
import { Button } from "@shared/ui/button";
import { ContextActionsPopover } from "@shared/ui/context-actions-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/ui/popover";
import type { ListResponse } from "@modules/lists/types/list.types";
import { useDeleteListModal } from "@modules/lists/store/delete-list-modal.store";
import { useListsModal } from "@modules/lists/store/lists-modal.store";

interface SidebarListItemProps {
	list: ListResponse;
	isActive: boolean;
	isCollapsed: boolean;
}

interface ListActionsProps {
	onEdit: () => void;
	onDelete: () => void;
}

function ListActions({ onEdit, onDelete }: ListActionsProps) {
	return (
		<div className="flex flex-col gap-1">
			<Button type="button" variant="ghost" className="w-full justify-start px-3" onClick={onEdit}>
				<Pencil className="size-4" />
				Редактировать
			</Button>
			<Button
				type="button"
				variant="ghost"
				className="w-full justify-start px-3 text-destructive hover:text-destructive"
				onClick={onDelete}
			>
				<Trash2 className="size-4" />
				Удалить
			</Button>
		</div>
	);
}

export function SidebarListItem({ list, isActive, isCollapsed }: SidebarListItemProps) {
	const [isActionsOpen, setIsActionsOpen] = useState(false);
	const contextMenu = useContextMenu();
	const openForEdit = useListsModal((state) => state.openForEdit);
	const openForDelete = useDeleteListModal((state) => state.openForDelete);

	const handleEdit = () => {
		setIsActionsOpen(false);
		contextMenu.close();
		openForEdit(list);
	};

	const handleDelete = () => {
		setIsActionsOpen(false);
		contextMenu.close();
		openForDelete(list);
	};

	const actions = <ListActions onEdit={handleEdit} onDelete={handleDelete} />;

	if (isCollapsed) {
		return (
			<>
				<Link
					href={`/lists/${list.id}`}
					title={list.name}
					onContextMenu={contextMenu.openFromMouseEvent}
					className={cn(
						"flex h-[40px] w-[40px] items-center justify-center rounded-[6px] transition-colors",
						isActive ? "bg-accent text-foreground" : "hover:bg-accent/50",
					)}
				>
					<div
						className="h-[22px] w-[22px] shrink-0 rounded-[4px]"
						style={{ backgroundColor: list.colorHex }}
					/>
				</Link>

				<ContextActionsPopover
					open={contextMenu.isOpen}
					position={contextMenu.position}
					onOpenChange={contextMenu.setIsOpen}
				>
					{actions}
				</ContextActionsPopover>
			</>
		);
	}

	return (
		<>
			<div
				onContextMenu={(event) => {
					setIsActionsOpen(false);
					contextMenu.openFromMouseEvent(event);
				}}
				className={cn(
					"flex h-[36px]! items-center justify-between gap-2 rounded-[6px] px-2.5 py-1 pr-1 transition-colors",
					isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/30",
				)}
			>
				<Link href={`/lists/${list.id}`} className="flex min-w-0 flex-1 items-center gap-2">
					<div
						className="h-[22px] w-[22px] shrink-0 rounded-[4px]"
						style={{ backgroundColor: list.colorHex }}
					/>
					<span className="box-border overflow-hidden text-ellipsis whitespace-nowrap text-[18px]">
						{list.name}
					</span>
				</Link>

				<Popover open={isActionsOpen} onOpenChange={setIsActionsOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							asChild={false}
							className="h-[24px]! w-[24px]! shrink-0 rounded-[6px]"
							variant="ghost"
							onClick={(event) => {
								event.stopPropagation();
								contextMenu.close();
							}}
						>
							<EllipsisVertical className="size-[14px]" strokeWidth={2} />
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" className="w-[220px] p-2">
						{actions}
					</PopoverContent>
				</Popover>
			</div>

			<ContextActionsPopover
				open={contextMenu.isOpen}
				position={contextMenu.position}
				onOpenChange={contextMenu.setIsOpen}
			>
				{actions}
			</ContextActionsPopover>
		</>
	);
}

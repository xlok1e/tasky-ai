"use client";

import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import { Popover, PopoverAnchor, PopoverContent } from "@shared/ui/popover";
import type { ContextMenuPosition } from "@shared/lib/use-context-menu";

interface ContextActionsPopoverProps {
	open: boolean;
	position: ContextMenuPosition | null;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
	className?: string;
}

export function ContextActionsPopover({
	open,
	position,
	onOpenChange,
	children,
	className,
}: ContextActionsPopoverProps) {
	if (!position) return null;

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverAnchor asChild>
				<span
					aria-hidden
					className="pointer-events-none fixed h-0 w-0"
					style={{ left: position.x, top: position.y }}
				/>
			</PopoverAnchor>
			<PopoverContent
				align="start"
				side="bottom"
				sideOffset={6}
				onOpenAutoFocus={(event) => event.preventDefault()}
				className={cn("w-[220px] p-2", className)}
			>
				{children}
			</PopoverContent>
		</Popover>
	);
}

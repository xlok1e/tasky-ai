"use client";

import { useCallback, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

export interface ContextMenuPosition {
	x: number;
	y: number;
}

export function useContextMenu() {
	const [isOpen, setIsOpen] = useState(false);
	const [position, setPosition] = useState<ContextMenuPosition | null>(null);

	const openAt = useCallback((x: number, y: number) => {
		setPosition({ x, y });
		setIsOpen(true);
	}, []);

	const openFromMouseEvent = useCallback(
		(event: ReactMouseEvent<HTMLElement>) => {
			event.preventDefault();
			event.stopPropagation();
			openAt(event.clientX, event.clientY);
		},
		[openAt],
	);

	const close = useCallback(() => {
		setIsOpen(false);
	}, []);

	return {
		isOpen,
		position,
		setIsOpen,
		openAt,
		openFromMouseEvent,
		close,
	};
}

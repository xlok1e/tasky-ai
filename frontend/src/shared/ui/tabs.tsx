"use client";

import { cn } from "@shared/lib/utils";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";
import {
	ComponentProps,
	ComponentPropsWithoutRef,
	ElementRef,
	forwardRef,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn("flex flex-col gap-2", className)}
			{...props}
		/>
	);
}

const TabsList = forwardRef<
	ElementRef<typeof TabsPrimitive.List>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
	const [indicatorStyle, setIndicatorStyle] = useState({
		left: 0,
		top: 0,
		width: 0,
		height: 0,
	});
	const tabsListRef = useRef<HTMLDivElement | null>(null);

	const updateIndicator = useCallback(() => {
		if (!tabsListRef.current) return;

		const activeTab = tabsListRef.current.querySelector<HTMLElement>('[data-state="active"]');
		if (!activeTab) return;

		const activeRect = activeTab.getBoundingClientRect();
		const tabsRect = tabsListRef.current.getBoundingClientRect();

		requestAnimationFrame(() => {
			setIndicatorStyle({
				left: activeRect.left - tabsRect.left,
				top: activeRect.top - tabsRect.top,
				width: activeRect.width,
				height: activeRect.height,
			});
		});
	}, []);

	useEffect(() => {
		const timeoutId = setTimeout(updateIndicator, 0);

		window.addEventListener("resize", updateIndicator);
		const observer = new MutationObserver(updateIndicator);

		if (tabsListRef.current) {
			observer.observe(tabsListRef.current, {
				attributes: true,
				childList: true,
				subtree: true,
			});
		}

		return () => {
			clearTimeout(timeoutId);
			window.removeEventListener("resize", updateIndicator);
			observer.disconnect();
		};
	}, [updateIndicator]);

	return (
		<div className="relative" ref={tabsListRef}>
			<TabsPrimitive.List
				ref={ref}
				data-slot="tabs-list"
				className={cn(
					"bg-background border border-border text-muted-foreground inline-flex h-[40px] w-fit items-center justify-center rounded-[8px] p-[3px] relative",
					className,
				)}
				{...props}
			/>
			<div
				className="bg-secondary dark:bg-input/30 dark:border-input absolute rounded-[6px] transition-all duration-200 ease-out pointer-events-none"
				style={indicatorStyle}
			/>
		</div>
	);
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = forwardRef<
	ElementRef<typeof TabsPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Trigger
		ref={ref}
		data-slot="tabs-trigger"
		className={cn(
			"data-[state=active]:text-foreground dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-3 text-[18px] font-regular whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 relative z-10",
			className,
		)}
		{...props}
	/>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = forwardRef<
	ElementRef<typeof TabsPrimitive.Content>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Content
		ref={ref}
		data-slot="tabs-content"
		className={cn("flex-1 outline-none", className)}
		{...props}
	/>
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };

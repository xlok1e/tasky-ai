"use client";

import { X } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Separator } from "@shared/ui/separator";
import { useAiAssistant } from "../hooks/useAiAssistant";

export function AiAssistantHeader() {
	const { onCloseAssistantChat } = useAiAssistant();

	return (
		<header className="px-[18px] pt-6">
			<div className="flex items-center gap-3 pb-6">
				<h2 className="flex-1 text-2xl font-normal tracking-tight text-primary">ИИ-ассистент</h2>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={onCloseAssistantChat}
					className="rounded-md text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
				>
					<X className="size-4" />
				</Button>
			</div>
			<Separator className="ml-[-20px]! mr-[-20px]! w-auto!" />
		</header>
	);
}

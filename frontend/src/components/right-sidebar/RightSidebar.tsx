"use client";

import { useEffect, useState } from "react";
import { AiAssistantPanel } from "@modules/ai-assistant";
import { useAiAssistant } from "@modules/ai-assistant/hooks/useAiAssistant";

export function RightSidebar() {
	const { isAssistantChatOpen } = useAiAssistant();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<aside
			style={{
				width: isAssistantChatOpen ? 343 : 0,
				minWidth: 0,
				overflow: "hidden",
				flexShrink: 0,
				transition: mounted ? "width 150ms ease-in-out" : "none",
			}}
			className="h-screen bg-background"
		>
			<div className="w-[343px] h-full border-l border-border">
				<AiAssistantPanel />
			</div>
		</aside>
	);
}

import { Bot } from "lucide-react";
import { AiAssistantPanel } from "@modules/ai-assistant";

export function RightSidebar() {
	return (
		<aside className="flex h-screen w-72 flex-col border-l bg-background shrink-0">
			<div className="flex items-center gap-2 border-b px-4 py-3">
				<Bot size={18} className="text-muted-foreground" />
				<span className="text-sm font-semibold tracking-tight">AI Ассистент</span>
			</div>
			<div className="flex-1 overflow-hidden">
				<AiAssistantPanel />
			</div>
		</aside>
	);
}

"use client";

import { useEffect, useRef } from "react";
import { useAiAssistant } from "../hooks/useAiAssistant";
import { ChatInput } from "./ChatInput";
import { AiAssistantHeader } from "./AiAssistantHeader";
import { AiAssistantMessages } from "./AiAssistantMessages";

export function AiAssistantPanel() {
	const { messages, isLoading, sendMessage, confirmTask, rejectTask } = useAiAssistant();
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isLoading]);

	return (
		<div className="flex h-full flex-col overflow-hidden bg-background justify-between">
			<AiAssistantHeader />
			<AiAssistantMessages
				messages={messages}
				isLoading={isLoading}
				bottomRef={bottomRef}
				onConfirmTask={confirmTask}
				onRejectTask={rejectTask}
			/>
			<div className="px-[18px] pb-6">
				<ChatInput onSend={sendMessage} isLoading={isLoading} />
			</div>
		</div>
	);
}

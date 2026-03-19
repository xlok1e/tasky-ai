"use client";

import { useEffect, useRef } from "react";
import { Spinner } from "@shared/ui/spinner";
import { useAiAssistant } from "../hooks/useAiAssistant";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

export function AiAssistantPanel() {
	const { messages, isLoading, sendMessage, confirmTask, rejectTask } = useAiAssistant();
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isLoading]);

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
				{messages.length === 0 && !isLoading && (
					<p className="text-center text-xs text-muted-foreground mt-8 px-4">
						Задайте вопрос или попросите создать задачу
					</p>
				)}

				{messages.map((message) => (
					<ChatMessage
						key={message.id}
						message={message}
						onConfirm={() => {
							if (message.pendingTask) {
								confirmTask(message.id, message.pendingTask);
							}
						}}
						onReject={() => rejectTask(message.id)}
					/>
				))}

				{isLoading && (
					<div className="flex items-start">
						<div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
							<Spinner className="h-4 w-4 text-muted-foreground" />
						</div>
					</div>
				)}

				<div ref={bottomRef} />
			</div>

			<div className="px-3 pb-3">
				<ChatInput onSend={sendMessage} isLoading={isLoading} />
			</div>
		</div>
	);
}

"use client";

import type { AiAssistantMessagesProps } from "../types/ai-assistant.types";
import { ChartLine, CircleFadingPlusIcon, CircleQuestionMark } from "lucide-react";
import { useAiAssistant } from "../hooks/useAiAssistant";
import { ChatMessage } from "../components/ChatMessage";

export function AiAssistantMessages({
	isLoading,
	bottomRef,
	onConfirmTask,
	onRejectTask,
}: AiAssistantMessagesProps) {
	const { messages } = useAiAssistant();

	return (
		<div className="flex-1 overflow-y-auto px-[18px]">
			<div className="space-y-3">
				{messages.length === 0 && !isLoading && (
					<>
						<p className="pt-8 text-center text-sm">Что вы можете:</p>
						<div className="flex flex-col ">
							<div className="p-2 rounded-[6px] flex items-center gap-2 text-muted-foreground">
								<CircleFadingPlusIcon strokeWidth={1} className="size-5" /> Попросить добавить
								задачу
							</div>
							<div className="p-2 rounded-[6px] flex items-center gap-2 text-muted-foreground">
								<CircleQuestionMark strokeWidth={1} className="size-5" /> Узнать задачи за период
							</div>
							<div className="p-2 rounded-[6px] flex items-center gap-2 text-muted-foreground">
								<ChartLine strokeWidth={1} className="size-5" /> Узнать статистику по задачам
							</div>
						</div>
					</>
				)}

				<div className="mt-3">
					{messages.map((message) => (
						<ChatMessage
							key={message.id}
							message={message}
							onConfirm={() => {
								if (!message.pendingTask) return;
								onConfirmTask(message.id, message.pendingTask);
							}}
							onReject={() => onRejectTask(message.id)}
						/>
					))}
				</div>
			</div>
			<div ref={bottomRef} />
		</div>
	);
}

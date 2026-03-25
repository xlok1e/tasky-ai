"use client";

import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import { Spinner } from "@shared/ui/spinner";
import { Check, X } from "lucide-react";
import { ChatMessageProps, ChatRole } from "../types/ai-assistant.types";

export function ChatMessage({ message, onConfirm, onReject }: ChatMessageProps) {
	const isUser = message.role === ChatRole.User;
	const hasPendingTask = !isUser && !!message.pendingTask;
	const { pendingTaskStatus } = message;

	return (
		<div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
			<div
				className={cn(
					"max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
					isUser
						? "rounded-br-sm bg-primary text-primary-foreground"
						: "rounded-bl-sm border border-border bg-background text-foreground",
				)}
			>
				{message.content}
			</div>

			{hasPendingTask && !pendingTaskStatus && (
				<div className="ml-1 flex w-full max-w-[88%] gap-2">
					<Button
						size="sm"
						variant="secondary"
						className="h-8 flex-1 gap-1.5 rounded-md text-xs font-normal"
						onClick={onConfirm}
						disabled={message.isConfirming}
					>
						{message.isConfirming ? <Spinner className="h-3 w-3" /> : <Check size={13} />}
						Подтвердить
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="h-8 flex-1 gap-1.5 rounded-md text-xs font-normal"
						onClick={onReject}
						disabled={message.isConfirming}
					>
						<X size={13} />
						Отклонить
					</Button>
				</div>
			)}

			{hasPendingTask && pendingTaskStatus && (
				<p
					className={cn(
						"ml-1 text-xs",
						pendingTaskStatus === "confirmed" ? "text-primary" : "text-muted-foreground",
					)}
				>
					{pendingTaskStatus === "confirmed" ? "Вы подтвердили действие" : "Вы отменили действие"}
				</p>
			)}
		</div>
	);
}

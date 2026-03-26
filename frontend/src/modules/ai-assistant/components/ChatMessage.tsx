"use client";

import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import { Spinner } from "@shared/ui/spinner";
import { Check, X } from "lucide-react";
import type { ChatMessageProps } from "../types/ai-assistant.types";
import { ChatRole } from "../types/ai-assistant.types";
import { getPendingUpdateFields } from "../utils/ai-assistsnt-utils";

export function ChatMessage({ message, onConfirm, onReject }: ChatMessageProps) {
	const isUser = message.role === ChatRole.User;
	const hasPendingTask = !isUser && !!message.pendingTask;
	const hasPendingUpdate = !isUser && !!message.pendingUpdate;
	const hasPendingAction = hasPendingTask || hasPendingUpdate;
	const { pendingActionStatus } = message;

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

			{hasPendingUpdate && message.pendingUpdate && (
				<div className="ml-1 w-full max-w-[88%] rounded-md border border-border bg-muted/40 px-3 py-2">
					<p className="mb-1.5 text-xs font-medium text-foreground">Изменения</p>
					<div className="space-y-1">
						{getPendingUpdateFields(message.pendingUpdate).map((field) => (
							<div key={field.label} className="flex items-baseline gap-2 text-xs">
								<span className="shrink-0 text-muted-foreground">{field.label}</span>
								<span className="text-foreground">{field.value}</span>
							</div>
						))}
					</div>
				</div>
			)}

			{hasPendingAction && !pendingActionStatus && (
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

			{hasPendingAction && pendingActionStatus && (
				<p
					className={cn(
						"ml-1 text-xs",
						pendingActionStatus === "confirmed" ? "text-primary" : "text-muted-foreground",
					)}
				>
					{pendingActionStatus === "confirmed" ? "Вы подтвердили действие" : "Вы отменили действие"}
				</p>
			)}
		</div>
	);
}

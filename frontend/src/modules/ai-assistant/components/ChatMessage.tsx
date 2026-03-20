"use client";

import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import { Spinner } from "@shared/ui/spinner";
import { Check, X, Calendar, AlignLeft, Flag } from "lucide-react";
import { ChatRole } from "../types/ai-assistant.types";
import type { ChatMessage as ChatMessageType, PendingTask } from "../types/ai-assistant.types";
import { formatDateRange } from "../utils/ai-assistsnt-utils";

const PRIORITY_LABEL: Record<PendingTask["priority"], string> = {
	Low: "Низкий",
	Medium: "Средний",
	High: "Высокий",
};

const PRIORITY_COLOR: Record<PendingTask["priority"], string> = {
	Low: "text-blue-500",
	Medium: "text-yellow-500",
	High: "text-red-500",
};

function PendingTaskPreview({ task }: { task: PendingTask }) {
	const dateRange = formatDateRange(task.startAt, task.endAt, task.isAllDay);

	return (
		<div className="mt-2 rounded-xl border bg-background px-3 py-2.5 text-xs space-y-1.5 max-w-[85%]">
			<p className="font-semibold text-sm leading-tight">{task.title}</p>

			<div className={cn("flex items-center gap-1.5", PRIORITY_COLOR[task.priority])}>
				<Flag size={11} />
				<span>{PRIORITY_LABEL[task.priority]} приоритет</span>
			</div>

			{task.description && (
				<div className="flex items-start gap-1.5 text-muted-foreground">
					<AlignLeft size={11} className="mt-0.5 shrink-0" />
					<span>{task.description}</span>
				</div>
			)}

			{dateRange && (
				<div className="flex items-center gap-1.5 text-muted-foreground">
					<Calendar size={11} />
					<span>{dateRange}</span>
				</div>
			)}
		</div>
	);
}

interface ChatMessageProps {
	message: ChatMessageType;
	onConfirm: () => void;
	onReject: () => void;
}

export function ChatMessage({ message, onConfirm, onReject }: ChatMessageProps) {
	const isUser = message.role === ChatRole.User;
	const hasPendingTask = !isUser && !!message.pendingTask;
	const { pendingTaskStatus } = message;

	return (
		<div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
			<div
				className={cn(
					"max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
					isUser
						? "bg-primary text-primary-foreground rounded-br-sm"
						: "bg-muted text-foreground rounded-bl-sm",
				)}
			>
				{message.content}
			</div>

			{hasPendingTask && <PendingTaskPreview task={message.pendingTask!} />}

			{hasPendingTask && !pendingTaskStatus && (
				<div className="flex gap-2 ml-1">
					<Button
						size="sm"
						variant="default"
						className="h-7 gap-1.5 text-xs"
						onClick={onConfirm}
						disabled={message.isConfirming}
					>
						{message.isConfirming ? <Spinner className="h-3 w-3" /> : <Check size={13} />}
						Подтвердить
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="h-7 gap-1.5 text-xs"
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
						pendingTaskStatus === "confirmed"
							? "text-green-600 dark:text-green-400"
							: "text-muted-foreground",
					)}
				>
					{pendingTaskStatus === "confirmed" ? "Вы подтвердили действие" : "Вы отменили действие"}
				</p>
			)}
		</div>
	);
}

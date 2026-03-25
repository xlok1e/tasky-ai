"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";
import { Spinner } from "@shared/ui/spinner";
import { SendHorizontal } from "lucide-react";

const MAX_TEXTAREA_HEIGHT = 200;
const MIN_TEXTAREA_HEIGHT = 38;

interface ChatInputProps {
	onSend: (text: string) => void;
	isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
	const [value, setValue] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
	}, [value]);

	const handleSend = () => {
		const trimmed = value.trim();
		if (!trimmed || isLoading) return;
		onSend(trimmed);
		setValue("");
		// Reset height after clear
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
		textareaRef.current?.focus();
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="flex items-end gap-2 w-full pt-3">
			<div className="flex flex-col items-start w-full">
				{isLoading && (
					<span
						className="inline-block mb-2 text-sm select-none"
						style={{
							background:
								"linear-gradient(90deg, var(--primary) 0%, var(--primary) 35%, rgba(255,255,255,0.95) 50%, var(--primary) 65%, var(--primary) 100%)",
							backgroundSize: "200% 100%",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
							backgroundClip: "text",
							animation: "text-shimmer 2s linear infinite",
						}}
					>
						Готовлю ответ
						<span style={{ opacity: 0, animation: "dot1-fade 2s ease-in-out infinite" }}>.</span>
						<span style={{ opacity: 0, animation: "dot2-fade 2s ease-in-out infinite" }}>.</span>
						<span style={{ opacity: 0, animation: "dot3-fade 2s ease-in-out infinite" }}>.</span>
					</span>
				)}
				<Textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Написать сообщение..."
					disabled={isLoading}
					rows={1}
					className="resize-none overflow-y-auto rounded-lg border border-border bg-background px-3 py-2 leading-snug shadow-none"
					style={{ minHeight: `${MIN_TEXTAREA_HEIGHT}px`, maxHeight: `${MAX_TEXTAREA_HEIGHT}px` }}
				/>
			</div>
			<Button
				type="button"
				size="icon"
				onClick={handleSend}
				disabled={isLoading || !value.trim()}
				className="h-[38px] w-[38px] shrink-0 rounded-lg"
				aria-label="Отправить сообщение"
			>
				{isLoading ? <Spinner className="h-4 w-4" /> : <SendHorizontal size={16} />}
			</Button>
		</div>
	);
}

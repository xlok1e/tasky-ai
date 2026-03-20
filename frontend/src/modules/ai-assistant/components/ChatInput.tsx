"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Button } from "@shared/ui/button";
import { Textarea } from "@shared/ui/textarea";
import { Spinner } from "@shared/ui/spinner";
import { SendHorizonal } from "lucide-react";

const MAX_TEXTAREA_HEIGHT = 350;

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
		<div className="flex items-end gap-2 border-t pt-3">
			<Textarea
				ref={textareaRef}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Написать сообщение…"
				disabled={isLoading}
				rows={1}
				className="resize-none leading-snug overflow-y-auto"
				style={{ minHeight: "38px", maxHeight: `${MAX_TEXTAREA_HEIGHT}px` }}
			/>
			<Button
				size="icon"
				onClick={handleSend}
				disabled={isLoading || !value.trim()}
				className="shrink-0 h-[38px] w-[38px]"
			>
				{isLoading ? <Spinner className="h-4 w-4" /> : <SendHorizonal size={16} />}
			</Button>
		</div>
	);
}

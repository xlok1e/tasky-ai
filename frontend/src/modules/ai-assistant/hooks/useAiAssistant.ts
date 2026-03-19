import { useAiAssistantStore } from "../store/ai-assistant.store";

export function useAiAssistant() {
	const messages = useAiAssistantStore((s) => s.messages);
	const isLoading = useAiAssistantStore((s) => s.isLoading);
	const sendMessage = useAiAssistantStore((s) => s.sendMessage);
	const confirmTask = useAiAssistantStore((s) => s.confirmTask);
	const rejectTask = useAiAssistantStore((s) => s.rejectTask);

	return { messages, isLoading, sendMessage, confirmTask, rejectTask };
}

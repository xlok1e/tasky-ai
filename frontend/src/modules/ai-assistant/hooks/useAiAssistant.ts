import { useAiAssistantStore } from '../store/ai-assistant.store'

export function useAiAssistant() {
	const messages = useAiAssistantStore(s => s.messages)
	const isLoading = useAiAssistantStore(s => s.isLoading)
	const sendMessage = useAiAssistantStore(s => s.sendMessage)
	const confirmTask = useAiAssistantStore(s => s.confirmTask)
	const rejectTask = useAiAssistantStore(s => s.rejectTask)
	const confirmTasks = useAiAssistantStore(s => s.confirmTasks)
	const rejectTasks = useAiAssistantStore(s => s.rejectTasks)
	const confirmUpdate = useAiAssistantStore(s => s.confirmUpdate)
	const rejectUpdate = useAiAssistantStore(s => s.rejectUpdate)
	const isAssistantChatOpen = useAiAssistantStore(s => s.isAssistantChatOpen)
	const onCloseAssistantChat = useAiAssistantStore(s => s.onCloseAssistantChat)
	const onOpenAssistantChat = useAiAssistantStore(s => s.onOpenAssistantChat)

	return {
		messages,
		isLoading,
		sendMessage,
		confirmTask,
		rejectTask,
		confirmTasks,
		rejectTasks,
		confirmUpdate,
		rejectUpdate,
		isAssistantChatOpen,
		onCloseAssistantChat,
		onOpenAssistantChat,
	}
}

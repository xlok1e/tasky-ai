'use client'

import type { AiAssistantMessagesProps } from '../types/ai-assistant.types'
import {
	ChartLine,
	CircleFadingPlusIcon,
	CircleQuestionMark,
} from 'lucide-react'
import { useAiAssistant } from '../hooks/useAiAssistant'
import { ChatMessage } from '../components/ChatMessage'

export function AiAssistantMessages({
	isLoading,
	bottomRef,
	onConfirmTask,
	onRejectTask,
	onConfirmTasks,
	onRejectTasks,
	onConfirmUpdate,
	onRejectUpdate,
}: AiAssistantMessagesProps) {
	const { messages } = useAiAssistant()

	return (
		<div className='flex-1 overflow-y-auto px-[18px]'>
			<div className='space-y-3'>
				{messages.length === 0 && !isLoading && (
					<>
						<p className='pt-8 text-center text-sm'>Что вы можете:</p>
						<div className='flex flex-col '>
							<div className='p-2 rounded-[6px] flex items-center gap-2 text-muted-foreground'>
								<CircleFadingPlusIcon strokeWidth={1} className='size-5' />{' '}
								Попросить добавить задачу
							</div>
							<div className='p-2 rounded-[6px] flex items-center gap-2 text-muted-foreground'>
								<CircleQuestionMark strokeWidth={1} className='size-5' /> Узнать
								задачи за период
							</div>
							<div className='p-2 rounded-[6px] flex items-center gap-2 text-muted-foreground'>
								<ChartLine strokeWidth={1} className='size-5' /> Узнать
								статистику по задачам
							</div>
						</div>
					</>
				)}

				<div className='flex flex-col mt-3 gap-4'>
					{messages.map(message => (
						<ChatMessage
							key={message.id}
							message={message}
							onConfirm={() => {
								if (message.pendingTasks?.length) {
									onConfirmTasks(message.id, message.pendingTasks)
								} else if (message.pendingTask) {
									onConfirmTask(message.id, message.pendingTask)
								} else if (message.pendingUpdate) {
									onConfirmUpdate(message.id, message.pendingUpdate)
								}
							}}
							onReject={() => {
								if (message.pendingTasks?.length) {
									onRejectTasks(message.id)
								} else if (message.pendingTask) {
									onRejectTask(message.id)
								} else {
									onRejectUpdate(message.id)
								}
							}}
						/>
					))}
				</div>
			</div>
			<div ref={bottomRef} />
		</div>
	)
}

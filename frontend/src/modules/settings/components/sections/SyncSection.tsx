import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@shared/ui/dialog'
import { Button } from '@shared/ui/button'
import { SettingsActionButton } from '../ui/SettingsActionButton'
import { SettingsInfoRow } from '../ui/SettingsInfoRow'
import { SettingsSection } from '../ui/SettingsSection'

interface SyncSectionProps {
	isConnected: boolean
	isGoogleAuthLoading: boolean
	isDisconnectModalOpen: boolean
	isDisconnecting: boolean
	onGoogleAction: () => void
	onDisconnectClick: () => void
	onDisconnectConfirm: () => void
	onDisconnectCancel: () => void
}

export function SyncSection({
	isConnected,
	isGoogleAuthLoading,
	isDisconnectModalOpen,
	isDisconnecting,
	onGoogleAction,
	onDisconnectClick,
	onDisconnectConfirm,
	onDisconnectCancel,
}: SyncSectionProps) {
	return (
		<>
			<SettingsSection title='Синхронизация' contentClassName='py-3'>
				<SettingsInfoRow
					label='Google Calendar'
					value={isConnected ? 'Подключен' : 'Не подключен'}
					valueMuted
				/>

				<div className='flex flex-wrap gap-3'>
					<SettingsActionButton
						type='button'
						className='w-fit'
						onClick={onGoogleAction}
						disabled={isGoogleAuthLoading}
					>
						{isGoogleAuthLoading
							? 'Подключение...'
							: isConnected
								? 'Изменить аккаунт Google'
								: 'Подключить Google'}
					</SettingsActionButton>

					{isConnected && (
						<SettingsActionButton
							type='button'
							className='w-fit text-destructive hover:text-destructive'
							onClick={onDisconnectClick}
							disabled={isGoogleAuthLoading}
						>
							Отключить синхронизацию
						</SettingsActionButton>
					)}
				</div>
			</SettingsSection>

			<Dialog open={isDisconnectModalOpen} onOpenChange={onDisconnectCancel}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Отключить синхронизацию?</DialogTitle>
						<DialogDescription className='pt-2 text-sm text-muted-foreground'>
							После отключения задачи, созданные во время синхронизации с Google
							Calendar, больше не будут отображаться в приложении. В вашем
							Google Calendar они сохранятся.
							<br />
							<br />
							Вы всегда сможете подключить синхронизацию снова.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className='gap-2'>
						<Button
							variant='outline'
							onClick={onDisconnectCancel}
							disabled={isDisconnecting}
						>
							Отмена
						</Button>
						<Button
							variant='destructive'
							onClick={onDisconnectConfirm}
							disabled={isDisconnecting}
						>
							{isDisconnecting ? 'Отвязываем...' : 'Отвязать'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

import { SettingsActionButton } from '../ui/SettingsActionButton'
import { SettingsInfoRow } from '../ui/SettingsInfoRow'
import { SettingsSection } from '../ui/SettingsSection'

interface SyncSectionProps {
	isConnected: boolean
	isGoogleAuthLoading: boolean
	onGoogleAction: () => void
}

export function SyncSection({
	isConnected,
	isGoogleAuthLoading,
	onGoogleAction,
}: SyncSectionProps) {
	return (
		<SettingsSection title='Синхронизация' contentClassName='py-3'>
			<SettingsInfoRow
				label='Google Calendar'
				value={isConnected ? 'Подключен' : 'Не подключен'}
				valueMuted
			/>

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
		</SettingsSection>
	)
}

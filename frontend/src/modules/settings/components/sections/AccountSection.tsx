import { SettingsActionButton } from '../ui/SettingsActionButton'
import { SettingsInfoRow } from '../ui/SettingsInfoRow'
import { SettingsSection } from '../ui/SettingsSection'

interface AccountSectionProps {
	username: string
	phoneNumber: string
	onLogout: () => void
}

export function AccountSection({
	username,
	phoneNumber,
	onLogout,
}: AccountSectionProps) {
	return (
		<SettingsSection title='Учетная запись' contentClassName='py-3'>
			<SettingsInfoRow label='Имя пользователя' value={username} valueMuted />
			{/* <SettingsInfoRow label='Номер телефона' value={phoneNumber} valueMuted /> */}

			<SettingsActionButton type='button' className='w-fit' onClick={onLogout}>
				Выйти из аккаунта
			</SettingsActionButton>
		</SettingsSection>
	)
}

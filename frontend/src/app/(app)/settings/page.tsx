import { SettingsView } from '@modules/settings'
import { Suspense } from 'react'

export default function SettingsPage() {
	return (
		<Suspense fallback={<div>Загрузка...</div>}>
			<SettingsView />
		</Suspense>
	)
}

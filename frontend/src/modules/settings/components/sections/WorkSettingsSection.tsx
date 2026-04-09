'use client'

import { Input } from '@shared/ui/input'
import { TimeInput } from '@shared/ui/time-input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@shared/ui/select'
import type { TimeZoneOption } from '../../constants/settings.constants'
import { NotificationSettingRow } from '../ui/NotificationSettingRow'
import { SettingsField } from '../ui/SettingsField'
import { SettingsSection } from '../ui/SettingsSection'

interface WorkSettingsSectionProps {
	workDayStart: string
	workDayEnd: string
	timeZone: string
	timezoneOptions: TimeZoneOption[]
	morningEnabled: boolean
	eveningEnabled: boolean
	morningNotificationTime: string
	eveningNotificationTime: string
	onWorkDayStartChange: (value: string) => void
	onWorkDayEndChange: (value: string) => void
	onTimeZoneChange: (value: string) => void
	onWorkDayStartBlur: () => void
	onWorkDayEndBlur: () => void
	onMorningToggle: (value: boolean) => void
	onEveningToggle: (value: boolean) => void
	onMorningTimeChange: (value: string) => void
	onEveningTimeChange: (value: string) => void
	onMorningTimeBlur: () => void
	onEveningTimeBlur: () => void
}

const timeInputClassName =
	'h-[42px] rounded-md border-border bg-card px-3 py-2 text-[18px] md:text-[18px] leading-6 text-foreground shadow-none focus-visible:ring-0 [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit]:text-[18px] [&::-webkit-datetime-edit]:leading-6 [&::-webkit-date-and-time-value]:text-left'
const selectTriggerClassName =
	'h-[42px] rounded-md border-border bg-card px-3 py-2 text-[18px] leading-6 text-foreground shadow-none focus-visible:ring-0'

export function WorkSettingsSection({
	workDayStart,
	workDayEnd,
	timeZone,
	timezoneOptions,
	morningEnabled,
	eveningEnabled,
	morningNotificationTime,
	eveningNotificationTime,
	onWorkDayStartChange,
	onWorkDayEndChange,
	onTimeZoneChange,
	onWorkDayStartBlur,
	onWorkDayEndBlur,
	onMorningToggle,
	onEveningToggle,
	onMorningTimeChange,
	onEveningTimeChange,
	onMorningTimeBlur,
	onEveningTimeBlur,
}: WorkSettingsSectionProps) {
	return (
		<SettingsSection title='Рабочие настройки'>
			<div className='grid w-full gap-[18px] md:grid-cols-3'>
				<SettingsField label='Начало рабочего дня'>
					<TimeInput
						value={workDayStart}
						onChange={onWorkDayStartChange}
						onBlur={onWorkDayStartBlur}
						className={timeInputClassName}
					/>
				</SettingsField>

				<SettingsField label='Конец рабочего дня'>
					<TimeInput
						value={workDayEnd}
						onChange={onWorkDayEndChange}
						onBlur={onWorkDayEndBlur}
						className={timeInputClassName}
					/>
				</SettingsField>

				<SettingsField label='Часовой пояс'>
					<Select value={timeZone} onValueChange={onTimeZoneChange}>
						<SelectTrigger className={`${selectTriggerClassName} w-full h-11!`}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent className='border border-border bg-card'>
							{timezoneOptions.map(option => (
								<SelectItem
									key={option.value}
									value={option.value}
									className='text-[18px] leading-6 text-foreground'
								>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingsField>
			</div>

			<div className='flex w-full flex-col gap-[18px] px-[6px] py-3'>
				<NotificationSettingRow
					switchId='settings-morning-notifications'
					title='Утренние уведомления'
					description='Напоминания о задачах на день'
					enabled={morningEnabled}
					time={morningNotificationTime}
					onToggle={onMorningToggle}
					onTimeChange={onMorningTimeChange}
					onTimeBlur={onMorningTimeBlur}
				/>

				<NotificationSettingRow
					switchId='settings-evening-notifications'
					title='Вечерние уведомления'
					description='Итоги дня'
					enabled={eveningEnabled}
					time={eveningNotificationTime}
					onToggle={onEveningToggle}
					onTimeChange={onEveningTimeChange}
					onTimeBlur={onEveningTimeBlur}
				/>
			</div>
		</SettingsSection>
	)
}

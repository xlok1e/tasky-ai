export interface TimeZoneOption {
	value: string
	label: string
}

export const TIMEZONE_OPTIONS: TimeZoneOption[] = [
	// Россия
	{ value: 'Europe/Kaliningrad', label: 'UTC+2 (Калининград)' },
	{ value: 'Europe/Minsk', label: 'UTC+3 (Минск)' },
	{ value: 'Europe/Moscow', label: 'UTC+3 (Москва)' },
	{ value: 'Asia/Yekaterinburg', label: 'UTC+5 (Екатеринбург)' },
	{ value: 'Asia/Omsk', label: 'UTC+6 (Омск)' },
	{ value: 'Asia/Novosibirsk', label: 'UTC+7 (Новосибирск)' },
	{ value: 'Asia/Irkutsk', label: 'UTC+8 (Иркутск)' },
	{ value: 'Asia/Yakutsk', label: 'UTC+9 (Якутск)' },
	{ value: 'Asia/Vladivostok', label: 'UTC+10 (Владивосток)' },
	{ value: 'Asia/Sakhalin', label: 'UTC+11 (Сахалин)' },
	{ value: 'Asia/Kamchatka', label: 'UTC+12 (Камчатка)' },
	// Международные
	{ value: 'UTC', label: 'UTC+0 (UTC)' },
	{ value: 'Europe/London', label: 'UTC+0 (Лондон)' },
	{ value: 'Europe/Paris', label: 'UTC+1 (Париж)' },
	{ value: 'Europe/Berlin', label: 'UTC+1 (Берлин)' },
	{ value: 'Europe/Kiev', label: 'UTC+2 (Киев)' },
	{ value: 'America/New_York', label: 'UTC-5 (Нью-Йорк)' },
	{ value: 'America/Chicago', label: 'UTC-6 (Чикаго)' },
	{ value: 'America/Denver', label: 'UTC-7 (Денвер)' },
	{ value: 'America/Los_Angeles', label: 'UTC-8 (Лос-Анджелес)' },
]

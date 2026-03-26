export interface UserProfile {
	id: number;
	telegramUsername: string | null;
	phoneNumber: string | null;
	createdAt: string;
}

export interface UserSettings {
	workDayStart: string;
	workDayEnd: string;
	timeZone: string;
	morningNotificationsEnabled: boolean;
	morningNotificationTime: string;
	eveningNotificationsEnabled: boolean;
	eveningNotificationTime: string;
	useBuiltinCalendar: boolean;
	onboardingCompleted: boolean;
}

export interface UpdateUserSettingsRequest {
	workDayStart?: string;
	workDayEnd?: string;
	timeZone?: string;
	morningNotificationsEnabled?: boolean;
	morningNotificationTime?: string;
	eveningNotificationsEnabled?: boolean;
	eveningNotificationTime?: string;
	useBuiltinCalendar?: boolean;
	onboardingCompleted?: boolean;
}

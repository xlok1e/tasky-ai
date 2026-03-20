"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Switch } from "@shared/ui/switch";
import { Label } from "@shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@shared/ui/select";
import { useAuthStore } from "@domains/auth/store/auth.store";
import { useUserStore } from "@/domains/user/store/user.store";
import { useGoogleStore } from "@/domains/google/store/google.store";
import { ThemeSwitcher } from "@components/ThemeSwitcher/theme-switcher";
import { RefreshCcw } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { toast } from "sonner";

const TIMEZONES = [
	"Europe/Moscow",
	"Europe/Kiev",
	"Europe/Minsk",
	"Europe/Kaliningrad",
	"Asia/Yekaterinburg",
	"Asia/Omsk",
	"Asia/Novosibirsk",
	"Asia/Irkutsk",
	"Asia/Yakutsk",
	"Asia/Vladivostok",
	"Asia/Sakhalin",
	"Asia/Kamchatka",
	"Europe/London",
	"Europe/Paris",
	"Europe/Berlin",
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Los_Angeles",
	"UTC",
];

export function SettingsView() {
	const router = useRouter();
	const { user, clearToken } = useAuthStore();
	const { profile, settings, updateSettings } = useUserStore();
	const { isConnected, isSyncing, sync, disconnect } = useGoogleStore();

	const [workDayStart, setWorkDayStart] = useState("");
	const [workDayEnd, setWorkDayEnd] = useState("");
	const [timeZone, setTimeZone] = useState("Europe/Moscow");
	const [morningEnabled, setMorningEnabled] = useState(false);
	const [eveningEnabled, setEveningEnabled] = useState(false);
	const [isSavingWorkTime, setIsSavingWorkTime] = useState(false);

	useEffect(() => {
		if (!settings) return;
		setWorkDayStart(settings.workDayStart?.slice(0, 5) ?? "09:00");
		setWorkDayEnd(settings.workDayEnd?.slice(0, 5) ?? "18:00");
		setTimeZone(settings.timeZone ?? "Europe/Moscow");
		setMorningEnabled(settings.morningNotificationsEnabled ?? false);
		setEveningEnabled(settings.eveningNotificationsEnabled ?? false);
	}, [settings]);

	const handleLogout = () => {
		clearToken();
		router.replace("/login");
	};

	const handleSaveWorkTime = async () => {
		setIsSavingWorkTime(true);
		const result = await updateSettings({
			workDayStart: workDayStart + ":00",
			workDayEnd: workDayEnd + ":00",
			timeZone,
		});
		setIsSavingWorkTime(false);
		if (result) toast.success("Рабочее время сохранено");
	};

	const handleToggleMorning = async (value: boolean) => {
		setMorningEnabled(value);
		await updateSettings({ morningNotificationsEnabled: value });
	};

	const handleToggleEvening = async (value: boolean) => {
		setEveningEnabled(value);
		await updateSettings({ eveningNotificationsEnabled: value });
	};

	const handleDisconnectGoogle = async () => {
		await disconnect();
		await updateSettings({ useBuiltinCalendar: true });
		toast.success("Google Calendar отключён");
	};

	return (
		<div className="flex flex-col gap-8 max-w-lg">
			<h1 className="text-2xl font-semibold">Настройки</h1>

			{/* Profile */}
			<section className="flex flex-col gap-3">
				<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Профиль
				</h2>
				<div className="flex flex-col gap-1 text-sm">
					{profile?.telegramUsername && (
						<p>
							Telegram:{" "}
							<span className="font-medium">@{profile.telegramUsername}</span>
						</p>
					)}
					{profile?.phoneNumber && (
						<p>
							Телефон: <span className="font-medium">{profile.phoneNumber}</span>
						</p>
					)}
					{profile?.createdAt && (
						<p className="text-muted-foreground">
							Зарегистрирован:{" "}
							{new Date(profile.createdAt).toLocaleDateString("ru-RU")}
						</p>
					)}
					{!profile && user && (
						<p>
							Вы вошли как:{" "}
							<span className="font-medium">{user.username ?? "—"}</span>
						</p>
					)}
				</div>
			</section>

			{/* Theme */}
			<section className="flex flex-col gap-3">
				<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Тема
				</h2>
				<ThemeSwitcher />
			</section>

			{/* Work Time */}
			<section className="flex flex-col gap-3">
				<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Рабочее время
				</h2>
				<div className="flex flex-col gap-3">
					<div className="flex gap-4">
						<div className="flex-1 space-y-1.5">
							<Label htmlFor="settings-work-start">Начало</Label>
							<Input
								id="settings-work-start"
								type="time"
								value={workDayStart}
								onChange={(e) => setWorkDayStart(e.target.value)}
							/>
						</div>
						<div className="flex-1 space-y-1.5">
							<Label htmlFor="settings-work-end">Конец</Label>
							<Input
								id="settings-work-end"
								type="time"
								value={workDayEnd}
								onChange={(e) => setWorkDayEnd(e.target.value)}
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="settings-timezone">Часовой пояс</Label>
						<Select value={timeZone} onValueChange={setTimeZone}>
							<SelectTrigger id="settings-timezone">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TIMEZONES.map((tz) => (
									<SelectItem key={tz} value={tz}>
										{tz}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button
						variant="outline"
						className="w-fit"
						onClick={handleSaveWorkTime}
						disabled={isSavingWorkTime}
					>
						{isSavingWorkTime ? "Сохранение..." : "Сохранить"}
					</Button>
				</div>
			</section>

			{/* Notifications */}
			<section className="flex flex-col gap-3">
				<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Уведомления
				</h2>
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Утренние уведомления</p>
							<p className="text-xs text-muted-foreground">В начале рабочего дня</p>
						</div>
						<Switch checked={morningEnabled} onCheckedChange={handleToggleMorning} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Вечерние уведомления</p>
							<p className="text-xs text-muted-foreground">В конце рабочего дня</p>
						</div>
						<Switch checked={eveningEnabled} onCheckedChange={handleToggleEvening} />
					</div>
				</div>
			</section>

			{/* Google Calendar */}
			<section className="flex flex-col gap-3">
				<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Google Calendar
				</h2>
				{isConnected ? (
					<div className="flex flex-col gap-3">
						<p className="text-sm text-green-500 font-medium">✓ Подключён</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => sync()}
								disabled={isSyncing}
								className="gap-2"
							>
								<RefreshCcw
									className={cn("size-4", isSyncing && "animate-spin")}
									strokeWidth={1.5}
								/>
								{isSyncing ? "Синхронизация..." : "Синхронизировать"}
							</Button>
							<Button
								variant="outline"
								onClick={handleDisconnectGoogle}
								className="text-destructive hover:text-destructive"
							>
								Отключить
							</Button>
						</div>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">Google Calendar не подключён</p>
				)}
			</section>

			{/* Logout */}
			<section className="flex flex-col gap-2">
				<Button variant="outline" className="w-fit" onClick={handleLogout}>
					Выйти из аккаунта
				</Button>
			</section>
		</div>
	);
}

export default SettingsView;


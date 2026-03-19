"use client";

import { useRouter } from "next/navigation";
import { Button } from "@shared/ui/button";
import { useAuthStore } from "@domains/auth/store/auth.store";
import { ThemeSwitcher } from "@components/ThemeSwitcher/theme-switcher";

export function SettingsView() {
	const router = useRouter();
	const { user, clearToken } = useAuthStore();

	const handleLogout = () => {
		clearToken();
		router.replace("/login");
	};

	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-2xl font-semibold">Настройки</h1>

			<div className="flex flex-col gap-2">
				<p className="text-sm font-medium">Тема</p>
				<ThemeSwitcher />
			</div>

			<div className="flex flex-col gap-2">
				<p className="text-sm text-muted-foreground">
					Вы вошли как: <span className="font-medium text-foreground">{user?.username ?? "—"}</span>
				</p>
				<Button variant="outline" className="w-fit" onClick={handleLogout}>
					Выйти из аккаунта
				</Button>
			</div>
		</div>
	);
}

export default SettingsView;

"use client";

import { Suspense } from "react";
import { Button } from "@shared/ui/button";
import { useLoginView } from "../hooks/useLoginView";

function LoginForm() {
	const { status, errorMessage, handleTelegramLogin, handleRetry } = useLoginView();

	return (
		<div className="flex flex-col items-center gap-6 text-center max-w-sm w-full px-4">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold">Добро пожаловать в Tasky</h1>
				<p className="text-sm text-muted-foreground">Войдите через Telegram, чтобы продолжить</p>
			</div>

			{status === "idle" && (
				<Button onClick={handleTelegramLogin} className="w-full">
					Войти через Telegram
				</Button>
			)}

			{status === "waiting" && (
				<div className="flex flex-col items-center gap-3">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
						Ожидаем подтверждения в Telegram…
					</div>
					<Button variant="ghost" size="sm" onClick={handleRetry}>
						Отмена
					</Button>
				</div>
			)}

			{status === "error" && (
				<div className="flex flex-col items-center gap-3">
					<p className="text-sm text-destructive">{errorMessage}</p>
					<Button onClick={handleRetry} variant="outline" className="w-full">
						Попробовать снова
					</Button>
				</div>
			)}
		</div>
	);
}

export function LoginView() {
	return (
		<div className="flex h-screen items-center justify-center">
			<Suspense>
				<LoginForm />
			</Suspense>
		</div>
	);
}

export default LoginView;

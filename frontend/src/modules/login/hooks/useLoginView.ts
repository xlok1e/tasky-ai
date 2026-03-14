import { checkTokenStatus, exchangeToken, getTelegramBotLink } from "@domains/auth/api/auth.api";
import { useAuthStore } from "@domains/auth/store/auth.store";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useState, useRef, useEffect } from "react";
import { AuthStatus } from "../types/login.types";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export function useLoginView() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const setToken = useAuthStore((s) => s.setToken);

	const [status, setStatus] = useState<AuthStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const stopPolling = () => {
		if (pollingRef.current) clearInterval(pollingRef.current);
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		pollingRef.current = null;
		timeoutRef.current = null;
	};

	useEffect(() => {
		return () => stopPolling();
	}, []);

	const redirectAfterLogin = () => {
		const from = searchParams.get("from") ?? "/inbox";
		router.replace(from);
	};

	const startPolling = (token: string) => {
		pollingRef.current = setInterval(async () => {
			try {
				const { isUsed } = await checkTokenStatus(token);
				if (!isUsed) return;

				stopPolling();

				const jwt = await exchangeToken(token);
				setToken(jwt);
				redirectAfterLogin();
			} catch {
				stopPolling();
				setStatus("error");
				setErrorMessage("Ошибка при проверке авторизации. Попробуйте снова.");
			}
		}, POLL_INTERVAL_MS);

		timeoutRef.current = setTimeout(() => {
			stopPolling();
			setStatus("error");
			setErrorMessage("Время ожидания истекло. Попробуйте снова.");
		}, POLL_TIMEOUT_MS);
	};

	const handleTelegramLogin = async () => {
		setStatus("waiting");
		setErrorMessage(null);

		try {
			const botLink = await getTelegramBotLink();

			const tokenMatch = botLink.match(/start=([^&]+)/);
			if (!tokenMatch) throw new Error("Не удалось получить токен из ссылки");
			const token = tokenMatch[1];

			window.open(botLink, "_blank", "noopener,noreferrer");

			startPolling(token);
		} catch {
			setStatus("error");
			setErrorMessage("Не удалось подключиться к серверу. Попробуйте позже.");
		}
	};

	const handleRetry = () => {
		stopPolling();
		setStatus("idle");
		setErrorMessage(null);
	};

	return {
		status,
		errorMessage,
		handleTelegramLogin,
		handleRetry,
	};
}

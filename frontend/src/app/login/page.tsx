"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "ui/button";
import { useAuthStore } from "@shared/store/auth.store";
import {
  checkTokenStatus,
  exchangeToken,
  getTelegramBotLink,
} from "@shared/api/auth.api";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

type AuthStatus = "idle" | "waiting" | "error";

function LoginForm() {
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

  return (
    <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full px-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Добро пожаловать в Tasky</h1>
        <p className="text-sm text-muted-foreground">
          Войдите через Telegram, чтобы продолжить
        </p>
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

export default function LoginPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}

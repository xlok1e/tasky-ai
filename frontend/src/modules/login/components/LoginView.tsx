"use client";

import { Suspense } from "react";
import type { SVGProps } from "react";
import { TriangleAlert } from "lucide-react";
import { AuthFlowShell } from "@modules/auth-flow/components/AuthFlowShell";
import { authFlowButtonVariants } from "@modules/auth-flow/lib/auth-flow-button.styles";
import { Button } from "@shared/ui/button";
import { cn } from "@shared/lib/utils";
import { useLoginView } from "../hooks/useLoginView";

function TelegramLogoIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			width="28"
			height="28"
			viewBox="0 0 28 28"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<g clipPath="url(#clip0_216_3237_login)">
				<rect width="28" height="28" rx="14" fill="white" />
				<path
					d="M28 14C28 17.713 26.525 21.274 23.8995 23.8995C21.274 26.525 17.713 28 14 28C10.287 28 6.72601 26.525 4.10051 23.8995C1.475 21.274 0 17.713 0 14C0 10.287 1.475 6.72601 4.10051 4.10051C6.72601 1.475 10.287 0 14 0C17.713 0 21.274 1.475 23.8995 4.10051C26.525 6.72601 28 10.287 28 14ZM14.5022 10.3355C13.1407 10.9025 10.4178 12.075 6.33675 13.853C5.67525 14.1155 5.327 14.3745 5.2955 14.6265C5.243 15.0517 5.77675 15.2198 6.503 15.449L6.80925 15.5453C7.52325 15.778 8.48575 16.0492 8.9845 16.0597C9.4395 16.0702 9.94525 15.8848 10.5035 15.4998C14.3167 12.9255 16.2855 11.6252 16.408 11.5972C16.4955 11.5763 16.618 11.5518 16.6985 11.6252C16.7808 11.697 16.772 11.8352 16.7633 11.872C16.7108 12.0977 14.616 14.0437 13.5327 15.0518C13.195 15.3667 12.9552 15.589 12.9062 15.6398C12.7984 15.75 12.6887 15.8585 12.5772 15.9653C11.9122 16.6058 11.4152 17.0853 12.6035 17.8693C13.1757 18.2473 13.6342 18.557 14.091 18.8685C14.588 19.208 15.085 19.5457 15.729 19.9692C15.8917 20.0743 16.0493 20.188 16.2015 20.2965C16.7808 20.7095 17.304 21.0805 17.9463 21.021C18.3207 20.986 18.7075 20.636 18.9035 19.586C19.3673 17.1063 20.279 11.7355 20.489 9.52175C20.5018 9.33772 20.4942 9.15284 20.4662 8.9705C20.4498 8.82336 20.3786 8.6878 20.2668 8.59075C20.1075 8.48083 19.9177 8.42389 19.7243 8.428C19.1992 8.43675 18.389 8.7185 14.5022 10.3355Z"
					fill="#29A1DD"
				/>
			</g>
			<defs>
				<clipPath id="clip0_216_3237_login">
					<rect width="28" height="28" rx="14" fill="white" />
				</clipPath>
			</defs>
		</svg>
	);
}

function LoginForm() {
	const { status, errorMessage, handleTelegramLogin, handleRetry } = useLoginView();

	const titleBlock = (
		<div className="space-y-6">
			<h1 className="text-2xl leading-[1.2] font-normal tracking-[-0.02em] text-[#161616] dark:text-foreground">
				Авторизация через Telegram
			</h1>
			<p
				className="max-w-[360px] text-[15px] leading-[1.35] text-[#616161] sm:text-[18px] dark:text-muted-foreground"
				style={{ fontFamily: "Inter, var(--font-line-seed-jp), sans-serif" }}
			>
				Войдите через Telegram бота, чтобы начать пользоваться приложением.
			</p>
		</div>
	);

	const actionBlock =
		status === "idle" ? (
			<Button
				onClick={handleTelegramLogin}
				className={cn(
					authFlowButtonVariants({ tone: "primary" }),
					"w-full justify-center px-4 sm:w-fit sm:min-w-[230px]",
				)}
			>
				<TelegramLogoIcon className="size-7 shrink-0" />
				Войти через Telegram
			</Button>
		) : null;

	const feedbackBlock =
		status === "waiting" ? (
			<div className="space-y-4 ">
				<div
					className="flex items-center gap-3 text-[15px] leading-6 text-[#616161] dark:text-muted-foreground"
					style={{ fontFamily: "Inter, var(--font-line-seed-jp), sans-serif" }}
				>
					<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
					Ожидаем подтверждения в Telegram...
				</div>
				<Button
					variant="outline"
					onClick={handleRetry}
					className={cn(authFlowButtonVariants({ tone: "outline" }), "w-full sm:w-auto")}
				>
					Отмена
				</Button>
			</div>
		) : status === "error" ? (
			<div className="max-w-[360px] space-y-4 rounded-[10px] border border-destructive/20 bg-destructive/5 p-4">
				<div
					className="flex items-start gap-3 text-[15px] leading-6 text-destructive"
					style={{ fontFamily: "Inter, var(--font-line-seed-jp), sans-serif" }}
				>
					<TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
					<p>{errorMessage}</p>
				</div>
				<Button
					onClick={handleRetry}
					variant="outline"
					className={cn(authFlowButtonVariants({ tone: "outline" }), "w-full sm:w-auto")}
				>
					Попробовать снова
				</Button>
			</div>
		) : null;

	return (
		<AuthFlowShell
			title="Авторизация через Telegram"
			description="Войдите через Telegram бота, чтобы начать пользоваться приложением."
			stepLabel="Шаг 1 из 4"
			contentClassName="min-h-[332px] justify-center pt-0"
			content={
				<div className="flex min-h-[332px] max-w-[392px] flex-col justify-center gap-8 text-left">
					{titleBlock}
					{actionBlock}
					{feedbackBlock}
				</div>
			}
		>
			{null}
		</AuthFlowShell>
	);
}

export function LoginView() {
	return (
		<Suspense>
			<LoginForm />
		</Suspense>
	);
}

export default LoginView;

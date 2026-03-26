import type { SVGProps } from "react";
import { authFlowButtonVariants } from "@modules/auth-flow/lib/auth-flow-button.styles";
import { Button } from "@shared/ui/button";
import { cn } from "@shared/lib/utils";
import { OnboardingShell } from "../OnboardingShell";

interface GoogleConnectStepProps {
	isLoading: boolean;
	onBack: () => void;
	onConnect: () => Promise<void>;
	stepLabel: string;
}

function GoogleLogoIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			width="28"
			height="28"
			viewBox="0 0 28 28"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M26.0749 14.2817C26.0749 13.4487 26.0067 12.6122 25.8632 11.7932H14.2432V16.5095H20.8967C20.7594 17.2642 20.4704 17.9832 20.0472 18.623C19.6239 19.2628 19.0753 19.8101 18.4344 20.2317V23.2942H22.4052C24.7362 21.1592 26.0749 18.0092 26.0749 14.2817Z"
				fill="#4285F4"
			/>
			<path
				d="M14.2448 26.25C17.5663 26.25 20.3681 25.165 22.4086 23.2925L18.4396 20.2318C17.3353 20.979 15.9091 21.4025 14.2483 21.4025C11.0353 21.4025 8.31055 19.2465 7.3323 16.3485H3.2373V19.5038C4.2691 21.5359 5.84408 23.2422 7.78725 24.4332C9.73043 25.6241 11.9657 26.253 14.2448 26.25Z"
				fill="#34A853"
			/>
			<path
				d="M7.32683 16.3485C6.81078 14.8278 6.81078 13.1793 7.32683 11.6585V8.5033H3.23533C2.37371 10.2088 1.9248 12.0928 1.9248 14.0035C1.9248 15.9143 2.37371 17.7983 3.23533 19.5038L7.32683 16.3485Z"
				fill="#FBBC04"
			/>
			<path
				d="M14.2448 6.59753C15.9994 6.56909 17.6954 7.22865 18.9698 8.43503L22.4873 4.93678C20.2518 2.85439 17.2997 1.71367 14.2448 1.75178C11.9651 1.74889 9.72925 2.37842 7.78595 3.57035C5.84265 4.76228 4.26806 6.4699 3.2373 8.50328L7.3253 11.655C8.2983 8.75353 11.0283 6.59753 14.2413 6.59753H14.2448Z"
				fill="#EA4335"
			/>
		</svg>
	);
}

export function GoogleConnectStep({
	isLoading,
	onBack,
	onConnect,
	stepLabel,
}: GoogleConnectStepProps) {
	return (
		<OnboardingShell
			title="Вход в Google аккаунт"
			description="Необходимо войти в Google аккаунт и предоставить доступ к календарю."
			stepLabel={stepLabel}
			contentClassName="min-h-[332px] justify-center pt-0"
			content={
				<div className="flex min-h-[332px] max-w-[392px] flex-col justify-center gap-8 text-left">
					<div className="space-y-6">
						<h1 className="text-2xl leading-[1.2] font-normal tracking-[-0.02em] text-[#161616] dark:text-foreground">
							Вход в Google аккаунт
						</h1>
						<p
							className="max-w-[360px] text-[15px] leading-[1.35] text-[#616161] sm:text-[18px] dark:text-muted-foreground"
							style={{ fontFamily: "Inter, var(--font-line-seed-jp), sans-serif" }}
						>
							Необходимо войти в Google аккаунт и предоставить доступ к календарю.
						</p>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row">
						<Button
							type="button"
							variant="outline"
							onClick={onBack}
							disabled={isLoading}
							className={cn(
								authFlowButtonVariants({ tone: "outline" }),
								"w-full sm:w-fit sm:min-w-[140px]",
							)}
						>
							Назад
						</Button>
						<Button
							onClick={onConnect}
							disabled={isLoading}
							className={cn(
								authFlowButtonVariants({ tone: "primary" }),
								"w-full justify-center px-4 sm:w-fit sm:min-w-[260px]",
							)}
						>
							<GoogleLogoIcon className="size-7 shrink-0" />
							{isLoading ? "Переход..." : "Войти в Google аккаунт"}
						</Button>
					</div>
				</div>
			}
		>
			{null}
		</OnboardingShell>
	);
}

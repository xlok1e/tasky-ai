import { authFlowButtonVariants } from "@modules/auth-flow/lib/auth-flow-button.styles";
import { Button } from "@shared/ui/button";
import { cn } from "@shared/lib/utils";
import { OnboardingShell } from "../OnboardingShell";

interface GoogleSuccessStepProps {
	isLoading: boolean;
	onCancel: () => Promise<void>;
	onContinue: () => void;
	stepLabel: string;
}

export function GoogleSuccessStep({
	isLoading,
	onCancel,
	onContinue,
	stepLabel,
}: GoogleSuccessStepProps) {
	return (
		<OnboardingShell
			title="Google календарь подключен!"
			description="Google аккаунт подключен.\nДоступ к календарю получен"
			stepLabel={stepLabel}
			contentClassName="min-h-[332px] justify-center pt-0"
			content={
				<div className="flex min-h-[332px] flex-col justify-center gap-8 text-left">
					<div className="space-y-6">
						<h1 className="text-2xl leading-[1.2] font-normal tracking-[-0.02em] text-[#161616] dark:text-foreground">
							Google календарь подключен!
						</h1>
						<p
							className="max-w-[360px] whitespace-pre-line text-[15px] leading-[1.35] text-[#616161] sm:text-[18px] dark:text-muted-foreground"
							style={{ fontFamily: "Inter, var(--font-line-seed-jp), sans-serif" }}
						>
							{"Google аккаунт подключен.\nДоступ к календарю получен"}
						</p>
					</div>

					<div className="flex gap-4 w-full">
						<Button
							type="button"
							onClick={onCancel}
							disabled={isLoading}
							className={cn(authFlowButtonVariants({ tone: "muted" }), "w-full flex-1")}
						>
							Назад
						</Button>
						<Button
							type="button"
							onClick={onContinue}
							disabled={isLoading}
							className={cn(authFlowButtonVariants({ tone: "secondary" }), "w-full flex-1")}
						>
							Далее
						</Button>
					</div>
				</div>
			}
		>
			{null}
		</OnboardingShell>
	);
}

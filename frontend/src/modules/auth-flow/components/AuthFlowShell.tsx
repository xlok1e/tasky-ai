import type { ReactNode } from "react";
import { Card } from "@shared/ui/card";
import { cn } from "@shared/lib/utils";
import { AuthFlowDecorativePanel } from "./AuthFlowDecorativePanel";

interface AuthFlowShellProps {
	actions?: ReactNode;
	children: ReactNode;
	content?: ReactNode;
	contentClassName?: string;
	description: string;
	headerClassName?: string;
	stepLabel?: string;
	title: string;
}

export function AuthFlowShell({
	actions,
	children,
	content,
	contentClassName,
	description,
	headerClassName,
	stepLabel,
	title,
}: AuthFlowShellProps) {
	return (
		<div className="relative min-h-screen overflow-hidden bg-[#f3f2f1] dark:bg-background">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute left-[-10%] top-[-12%] h-72 w-72 rounded-full bg-primary/7 blur-3xl" />
				<div className="absolute bottom-[-10%] right-[-6%] h-80 w-80 rounded-full bg-secondary/18 blur-3xl" />
			</div>

			<div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1100px] items-center">
				<Card className="grid w-full gap-0 overflow-hidden rounded-[18px] border-border/50 py-0 shadow-[0_16px_40px_rgba(0,0,0,0.08)] md:min-h-[596px] md:grid-cols-[1fr_550px]">
					<div className="flex min-h-[520px] flex-col justify-between bg-[#f7f7f7] dark:bg-card px-[24px] py-[44px] md:min-h-[596px] ">
						<div className="space-y-10">
							<div className="px-6 text-center">
								<p className="text-[38px] leading-none font-bold tracking-[-0.03em] text-primary sm:text-[44px]">
									TaskyAI
								</p>
							</div>

							<div
								className={cn(
									"flex min-h-[296px] flex-col justify-center space-y-8 opacity-80",
									contentClassName,
								)}
							>
								{content ?? (
									<>
										<div className={cn("space-y-6", headerClassName)}>
											<h1 className="text-2xl leading-[1.2] font-normal tracking-[-0.02em] text-[#161616] dark:text-foreground">
												{title}
											</h1>
											<p
												className="text-[15px] leading-[1.35] text-[#616161] sm:text-[18px] dark:text-muted-foreground"
												style={{ fontFamily: "Inter, var(--font-line-seed-jp), sans-serif" }}
											>
												{description}
											</p>
										</div>

										<div className="space-y-4">{children}</div>
									</>
								)}
							</div>
						</div>

						<div className="space-y-5">
							{actions}
							{stepLabel ? (
								<p className="text-right text-[15px] font-normal text-[#616161] sm:text-[18px] dark:text-muted-foreground">
									{stepLabel}
								</p>
							) : null}
						</div>
					</div>

					<AuthFlowDecorativePanel />
				</Card>
			</div>
		</div>
	);
}

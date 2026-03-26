import type { ReactNode } from "react";
import { AuthFlowShell } from "@modules/auth-flow/components/AuthFlowShell";

interface OnboardingShellProps {
	actions?: ReactNode;
	children: ReactNode;
	content?: ReactNode;
	contentClassName?: string;
	description: string;
	headerClassName?: string;
	stepLabel: string;
	title: string;
}

export function OnboardingShell({
	actions,
	children,
	content,
	contentClassName,
	description,
	headerClassName,
	stepLabel,
	title,
}: OnboardingShellProps) {
	return (
		<AuthFlowShell
			actions={actions}
			content={content}
			contentClassName={contentClassName}
			description={description}
			headerClassName={headerClassName}
			stepLabel={stepLabel}
			title={title}
		>
			{children}
		</AuthFlowShell>
	);
}

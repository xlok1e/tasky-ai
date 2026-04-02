import { Button } from "@shared/ui/button";

interface StatisticsErrorStateProps {
	onRetry: () => void;
}

export function StatisticsErrorState({ onRetry }: StatisticsErrorStateProps) {
	return (
		<div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[8px] border border-border px-6 text-center">
			<p className="text-[18px] font-medium text-foreground">Статистику не удалось загрузить</p>
			<p className="max-w-[420px] text-sm text-muted-foreground">
				Проверьте доступность сервера или попробуйте выбрать другой период.
			</p>
			<Button type="button" onClick={onRetry}>
				Повторить запрос
			</Button>
		</div>
	);
}

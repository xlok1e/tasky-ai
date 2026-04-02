import type { StatisticsMetricCardItem } from "@modules/statistics/types/statistics.types";
import { StatisticsMetricCard } from "./StatisticsMetricCard";

interface StatisticsMetricsGridProps {
	items: StatisticsMetricCardItem[];
	isLoading: boolean;
}

export function StatisticsMetricsGrid({ items, isLoading }: StatisticsMetricsGridProps) {
	if (isLoading) {
		return (
			<div className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<div
						key={`statistics-skeleton-card-${index}`}
						className="h-[86px] animate-pulse rounded-[8px] border border-border bg-muted/50"
					/>
				))}
			</div>
		);
	}

	return (
		<div className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-4">
			{items.map(item => (
				<StatisticsMetricCard key={item.id} label={item.label} value={item.value} />
			))}
		</div>
	);
}

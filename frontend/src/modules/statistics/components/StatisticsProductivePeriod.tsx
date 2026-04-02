interface StatisticsProductivePeriodProps {
	value: string;
	isLoading: boolean;
}

export function StatisticsProductivePeriod({ value, isLoading }: StatisticsProductivePeriodProps) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-[18px] leading-6 font-normal text-foreground">Самый продуктивный период</h2>
			{isLoading ? (
				<div className="h-7 w-48 animate-pulse rounded bg-muted/50" />
			) : (
				<p className="text-[22px] leading-6 font-normal text-foreground">{value}</p>
			)}
		</section>
	);
}

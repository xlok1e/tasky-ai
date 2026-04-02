import { STATISTICS_METRIC_BORDER_COLOR, STATISTICS_METRIC_VALUE_COLOR } from "@modules/statistics/constants/statistics.constants";

interface StatisticsMetricCardProps {
	label: string;
	value: string;
}

export function StatisticsMetricCard({ label, value }: StatisticsMetricCardProps) {
	return (
		<div
			className="flex min-h-[86px] items-center justify-center rounded-[8px] border px-4 py-3 text-center"
			style={{ borderColor: STATISTICS_METRIC_BORDER_COLOR }}
		>
			<div className="flex flex-col items-center justify-center gap-2">
				<p className="text-[16px] leading-5 text-foreground">{label}</p>
				<p className="text-[24px] leading-7 font-bold" style={{ color: STATISTICS_METRIC_VALUE_COLOR }}>
					{value}
				</p>
			</div>
		</div>
	);
}

"use client";

import { Pie, PieChart } from "recharts";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@shared/ui/chart";
import type { StatisticsPieSliceItem } from "@modules/statistics/types/statistics.types";
import { createPieChartConfig } from "@modules/statistics/utils/statistics.utils";

function isStatisticsPieSliceItem(value: unknown): value is StatisticsPieSliceItem {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	return (
		"listName" in value &&
		"taskCount" in value &&
		"completedCount" in value &&
		"fill" in value &&
		typeof value.listName === "string" &&
		typeof value.taskCount === "number" &&
		typeof value.completedCount === "number" &&
		typeof value.fill === "string"
	);
}

function createDistributionChartConfig(data: StatisticsPieSliceItem[]): ChartConfig {
	return {
		taskCount: {
			label: "Задачи",
		},
		...createPieChartConfig(data),
	};
}

function formatTooltipValue(value: unknown): string {
	if (typeof value === "number" || typeof value === "string") {
		return String(value);
	}

	if (Array.isArray(value)) {
		return value.join(", ");
	}

	return "0";
}

function renderDistributionTooltip(
	value: unknown,
	_name: unknown,
	entry: { payload?: unknown },
): React.ReactNode {
	if (!isStatisticsPieSliceItem(entry.payload)) {
		return null;
	}

	return (
		<div className="flex w-full flex-col gap-1">
			<div className="flex min-w-[160px] items-center justify-between gap-4">
				<span className="text-muted-foreground">Список</span>
				<span className="font-medium text-foreground">{entry.payload.listName}</span>
			</div>
			<div className="flex items-center justify-between gap-4">
				<span className="text-muted-foreground">Всего задач</span>
				<span className="font-medium text-foreground">{formatTooltipValue(value)}</span>
			</div>
			<div className="flex items-center justify-between gap-4">
				<span className="text-muted-foreground">Выполнено</span>
				<span className="font-medium text-foreground">{entry.payload.completedCount}</span>
			</div>
		</div>
	);
}

interface StatisticsDistributionChartProps {
	data: StatisticsPieSliceItem[];
	isLoading: boolean;
}

export function StatisticsDistributionChart({ data, isLoading }: StatisticsDistributionChartProps) {
	const chartConfig = createDistributionChartConfig(data);

	return (
		<section className="flex flex-col gap-6">
			<h2 className="text-[22px] leading-6 font-normal text-foreground">Распределение по спискам</h2>
			{isLoading ? (
				<div className="h-[320px] animate-pulse rounded-[8px] border border-border bg-muted/50" />
			) : data.length === 0 ? (
				<div className="flex h-[320px] items-center justify-center rounded-[8px] border border-border text-sm text-muted-foreground">
					Нет данных за выбранный период
				</div>
			) : (
				<div className="flex flex-col items-center gap-6">
					<ChartContainer config={chartConfig} className="h-[260px] w-full max-w-[360px] aspect-auto">
						<PieChart>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										hideLabel
										nameKey="listName"
										formatter={renderDistributionTooltip}
									/>
								}
							/>
							<Pie
								data={data}
								dataKey="taskCount"
								nameKey="listName"
								stroke="#FFFFFF"
								strokeWidth={1}
								cx="50%"
								cy="50%"
								outerRadius={112}
							/>
						</PieChart>
					</ChartContainer>

					<div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
						{data.map(item => (
							<div key={item.listName} className="flex items-center gap-3">
								<span className="h-[22px] w-[22px] rounded-[4px]" style={{ backgroundColor: item.fill }} />
								<span className="text-[18px] leading-6 text-foreground">{item.listName}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</section>
	);
}

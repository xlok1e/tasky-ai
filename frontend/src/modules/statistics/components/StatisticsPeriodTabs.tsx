import { Tabs, TabsList, TabsTrigger } from "@shared/ui/tabs";
import type {
	StatisticsPeriodTabItem,
	StatisticsPresetTabValue,
} from "@modules/statistics/types/statistics.types";

interface StatisticsPeriodTabsProps {
	tabs: StatisticsPeriodTabItem[];
	activeValue: StatisticsPresetTabValue | "custom";
	onValueChange: (value: StatisticsPresetTabValue) => void;
}

export function StatisticsPeriodTabs({
	tabs,
	activeValue,
	onValueChange,
}: StatisticsPeriodTabsProps) {
	return (
		<Tabs
			value={activeValue === "custom" ? "" : activeValue}
			onValueChange={value => onValueChange(value as StatisticsPresetTabValue)}
		>
			<TabsList>
				{tabs.map(tab => (
					<TabsTrigger key={tab.value} value={tab.value}>
						{tab.label}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}

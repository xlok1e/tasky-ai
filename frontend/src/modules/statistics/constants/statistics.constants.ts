import type { StatisticsPeriodTabItem } from "@modules/statistics/types/statistics.types";

export const STATISTICS_PERIOD_TABS: StatisticsPeriodTabItem[] = [
	{ value: "day", label: "День" },
	{ value: "week", label: "Неделя" },
	{ value: "month", label: "Месяц" },
	{ value: "year", label: "Год" },
];

export const STATISTICS_METRIC_VALUE_COLOR = "#809671";
export const STATISTICS_METRIC_BORDER_COLOR = "#E5D2BB";
export const STATISTICS_PERIOD_ACTIVE_BACKGROUND = "#DADCC9";
export const STATISTICS_PERIOD_IDLE_BACKGROUND = "#F3F2F1";
export const STATISTICS_PERIOD_TEXT_COLOR = "#251818";
export const STATISTICS_BAR_COLOR = "#DADCC9";
export const STATISTICS_GRID_COLOR = "#E5D2BB";
export const STATISTICS_PIE_FALLBACK_COLORS = ["#E5D2B8", "#D2AB80", "#F7D197", "#887963"];

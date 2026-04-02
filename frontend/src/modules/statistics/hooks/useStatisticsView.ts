"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { STATISTICS_PERIOD_TABS } from "@modules/statistics/constants/statistics.constants";
import { useStatisticsDateRangePicker } from "@modules/statistics/hooks/useStatisticsDateRangePicker";
import { useStatisticsStore } from "@modules/statistics/store/statistics.store";
import type {
	StatisticsDateRange,
	StatisticsPeriodPreset,
	StatisticsPresetTabValue,
} from "@modules/statistics/types/statistics.types";
import {
	createEmptyStatisticsData,
	createStatisticsMetricCards,
	createStatisticsRangeFromPreset,
	resolveStatisticsPreset,
} from "@modules/statistics/utils/statistics.utils";

export function useStatisticsView() {
	const [selectedRange, setSelectedRange] = useState<StatisticsDateRange>(() =>
		createStatisticsRangeFromPreset("week"),
	);
	const [activePreset, setActivePreset] = useState<StatisticsPeriodPreset>("week");

	const data = useStatisticsStore(state => state.data);
	const isLoading = useStatisticsStore(state => state.isLoading);
	const error = useStatisticsStore(state => state.error);
	const fetchStatistics = useStatisticsStore(state => state.fetchStatistics);

	useEffect(() => {
		void fetchStatistics(selectedRange);
	}, [fetchStatistics, selectedRange.endDate, selectedRange.startDate]);

	const handlePresetChange = useCallback((preset: StatisticsPresetTabValue) => {
		const nextRange = createStatisticsRangeFromPreset(preset);
		setSelectedRange(nextRange);
		setActivePreset(preset);
	}, []);

	const handleCustomRangeApply = useCallback((range: StatisticsDateRange) => {
		setSelectedRange(range);
		setActivePreset(resolveStatisticsPreset(range));
	}, []);

	const handleRetry = useCallback(() => {
		void fetchStatistics(selectedRange);
	}, [fetchStatistics, selectedRange]);

	const dateRangePicker = useStatisticsDateRangePicker({
		range: selectedRange,
		onApplyRange: handleCustomRangeApply,
	});

	const statisticsData = data ?? createEmptyStatisticsData();

	const metrics = useMemo(() => createStatisticsMetricCards(data), [data]);

	return {
		periodTabs: STATISTICS_PERIOD_TABS,
		activePreset,
		dateRangePicker,
		metrics,
		statisticsData,
		isLoading,
		error,
		hasHistogramData: statisticsData.histogramData.length > 0,
		hasPieChartData: statisticsData.pieChartData.length > 0,
		handlePresetChange,
		handleRetry,
	};
}

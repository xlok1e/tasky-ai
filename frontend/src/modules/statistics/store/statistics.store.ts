import { create } from "zustand";
import { fetchStatistics as fetchStatisticsRequest } from "@modules/statistics/api/statistics.api";
import type { StatisticsData, StatisticsDateRange } from "@modules/statistics/types/statistics.types";
import {
	createStatisticsRequestPayload,
	mapStatisticsResponseToData,
	validateStatisticsDateRange,
} from "@modules/statistics/utils/statistics.utils";

interface StatisticsState {
	data: StatisticsData | null;
	isLoading: boolean;
	error: string | null;
	requestSequence: number;
	fetchStatistics: (range: StatisticsDateRange) => Promise<void>;
}

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
	data: null,
	isLoading: false,
	error: null,
	requestSequence: 0,

	fetchStatistics: async range => {
		const validationError = validateStatisticsDateRange(range);
		if (validationError) {
			set({ error: validationError, isLoading: false });
			return;
		}

		const nextRequestSequence = get().requestSequence + 1;
		set({ isLoading: true, error: null, requestSequence: nextRequestSequence });

		try {
			const response = await fetchStatisticsRequest(createStatisticsRequestPayload(range));
			if (get().requestSequence !== nextRequestSequence) {
				return;
			}

			set({
				data: mapStatisticsResponseToData(response),
				isLoading: false,
				error: null,
			});
		} catch {
			if (get().requestSequence !== nextRequestSequence) {
				return;
			}

			set({
				isLoading: false,
				error: "Не удалось загрузить статистику за выбранный период.",
			});
		}
	},
}));

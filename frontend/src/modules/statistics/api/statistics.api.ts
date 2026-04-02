import apiClient from "@shared/lib/axios";
import type {
	StatisticsRequest,
	StatisticsResponse,
} from "@modules/statistics/types/statistics.api.types";

export async function fetchStatistics(request: StatisticsRequest): Promise<StatisticsResponse> {
	const response = await apiClient.post<StatisticsResponse>("/api/analytics", request);
	return response.data;
}

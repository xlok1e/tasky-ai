'use client'

import { Separator } from '@shared/ui/separator'
import { StatisticsCompletedChart } from '@modules/statistics/components/StatisticsCompletedChart'
import { StatisticsDistributionChart } from '@modules/statistics/components/StatisticsDistributionChart'
import { StatisticsErrorState } from '@modules/statistics/components/StatisticsErrorState'
import { StatisticsHeader } from '@modules/statistics/components/StatisticsHeader'
import { StatisticsMetricsGrid } from '@modules/statistics/components/StatisticsMetricsGrid'
import { StatisticsProductivePeriod } from '@modules/statistics/components/StatisticsProductivePeriod'
import { useStatisticsView } from '@modules/statistics/hooks/useStatisticsView'
import { PageLoader } from '@shared/ui/page-loader'
import { useGoogleStore } from '@/domains/google/store/google.store'

export function StatisticsView() {
	const statisticsView = useStatisticsView()
	const isGoogleConnected = useGoogleStore(state => state.isConnected)

	return (
		<div className='flex w-full flex-col gap-[45px] pb-8'>
			<StatisticsHeader
				periodTabs={statisticsView.periodTabs}
				activePreset={statisticsView.activePreset}
				dateRangePicker={statisticsView.dateRangePicker}
				onPresetChange={statisticsView.handlePresetChange}
			/>

			{statisticsView.error ? (
				<StatisticsErrorState onRetry={statisticsView.handleRetry} />
			) : statisticsView.isLoading &&
			  !statisticsView.hasHistogramData &&
			  !statisticsView.hasPieChartData ? (
				<PageLoader />
			) : (
				<div className='flex flex-col gap-6'>
					<StatisticsMetricsGrid
						items={statisticsView.metrics}
						isLoading={statisticsView.isLoading}
					/>

					<Separator />

					<StatisticsProductivePeriod
						value={statisticsView.statisticsData.mostProductivePeriod}
						isLoading={statisticsView.isLoading}
					/>

					<Separator />

					<StatisticsCompletedChart
						data={statisticsView.statisticsData.histogramData}
						isLoading={statisticsView.isLoading}
					/>

					{!isGoogleConnected && (
						<>
							<Separator />

							<StatisticsDistributionChart
								data={statisticsView.statisticsData.pieChartData}
								isLoading={statisticsView.isLoading}
							/>
						</>
					)}
				</div>
			)}
		</div>
	)
}

import { useCallback, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { toastMessage } from "@/shared/toast/toast";
import type {
	StatisticsDateRange,
	StatisticsDateRangePickerController,
} from "@modules/statistics/types/statistics.types";
import {
	formatStatisticsDateRangeLabel,
	normalizeStatisticsDateRange,
	validateStatisticsDateRange,
} from "@modules/statistics/utils/statistics.utils";

interface UseStatisticsDateRangePickerOptions {
	range: StatisticsDateRange;
	onApplyRange: (range: StatisticsDateRange) => void;
}

function toDateRange(range: StatisticsDateRange): DateRange {
	return {
		from: range.startDate,
		to: range.endDate,
	};
}

function normalizeDraftRange(range: DateRange | undefined): StatisticsDateRange | null {
	if (!range?.from) {
		return null;
	}

	return normalizeStatisticsDateRange({
		startDate: range.from,
		endDate: range.to ?? range.from,
	});
}

export function useStatisticsDateRangePicker({
	range,
	onApplyRange,
}: UseStatisticsDateRangePickerOptions): StatisticsDateRangePickerController {
	const [isOpen, setIsOpen] = useState(false);
	const [draftRange, setDraftRange] = useState<DateRange | undefined>(() => toDateRange(range));
	const [displayedMonth, setDisplayedMonth] = useState(range.startDate);

	const rangeLabel = useMemo(() => {
		const normalizedRange = normalizeDraftRange(draftRange) ?? range;
		return formatStatisticsDateRangeLabel(normalizedRange);
	}, [draftRange, range]);

	const syncDraftWithCurrentRange = useCallback(() => {
		setDraftRange(toDateRange(range));
		setDisplayedMonth(range.startDate);
	}, [range]);

	const onOpenChange = useCallback(
		(open: boolean) => {
			setIsOpen(open);
			if (open) {
				syncDraftWithCurrentRange();
			}
		},
		[syncDraftWithCurrentRange],
	);

	const onSelectRange = useCallback((nextRange: DateRange | undefined) => {
		setDraftRange(nextRange);
		if (nextRange?.from) {
			setDisplayedMonth(nextRange.from);
		}
	}, []);

	const onCancel = useCallback(() => {
		syncDraftWithCurrentRange();
		setIsOpen(false);
	}, [syncDraftWithCurrentRange]);

	const onApply = useCallback(() => {
		const normalizedRange = normalizeDraftRange(draftRange);
		if (!normalizedRange) {
			toastMessage.showError("Выберите период для статистики");
			return;
		}

		const validationError = validateStatisticsDateRange(normalizedRange);
		if (validationError) {
			toastMessage.showError(validationError);
			return;
		}

		onApplyRange(normalizedRange);
		setIsOpen(false);
	}, [draftRange, onApplyRange]);

	return {
		isOpen,
		buttonLabel: "Выбрать период",
		rangeLabel,
		draftRange,
		displayedMonth,
		onOpenChange,
		onSelectRange,
		onMonthChange: setDisplayedMonth,
		onCancel,
		onApply,
	};
}

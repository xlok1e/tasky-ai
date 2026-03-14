export function deriveAllDay(
	startDate: Date,
	endDate: Date,
	isAllDay?: boolean,
	fallback?: boolean,
): boolean {
	if (typeof isAllDay === "boolean") return isAllDay;
	const dayDiff = endDate.getTime() - startDate.getTime();
	const startsAtMidnight =
		startDate.getHours() === 0 && startDate.getMinutes() === 0 && startDate.getSeconds() === 0;
	const endsAtMidnight =
		endDate.getHours() === 0 && endDate.getMinutes() === 0 && endDate.getSeconds() === 0;
	if (startsAtMidnight && endsAtMidnight && dayDiff >= 24 * 60 * 60 * 1000) return true;
	if (!startsAtMidnight || dayDiff < 24 * 60 * 60 * 1000) return false;
	return fallback ?? false;
}

export function clampToSingleDay(startDate: Date): Date {
	const end = new Date(startDate);
	end.setHours(23, 59, 59, 999);
	return end;
}

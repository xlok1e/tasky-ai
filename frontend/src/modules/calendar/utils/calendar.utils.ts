/**
 * Returns '#ffffff' or '#000000' for readable text on the given hex background.
 */
export function getContrastColor(hexColor: string): string {
	const cleaned = hexColor.replace("#", "");
	if (cleaned.length !== 6) return "#ffffff";
	const r = parseInt(cleaned.slice(0, 2), 16);
	const g = parseInt(cleaned.slice(2, 4), 16);
	const b = parseInt(cleaned.slice(4, 6), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.55 ? "#000000" : "#ffffff";
}

export function hexToRgba(hex: string, alpha: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

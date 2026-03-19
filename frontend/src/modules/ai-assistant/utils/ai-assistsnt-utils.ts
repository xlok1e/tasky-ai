import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";

export function formatDateRange(
	startAt: string | null,
	endAt: string | null,
	isAllDay: boolean,
): string | null {
	if (!startAt && !endAt) return null;

	const dateFormat = "d MMMM yyyy";
	const timeFormat = "HH:mm";
	const opts = { locale: ru };

	if (isAllDay) {
		const start = startAt ? format(new Date(startAt), dateFormat, opts) : null;
		const end = endAt ? format(new Date(endAt), dateFormat, opts) : null;
		if (start && end && start !== end) return `${start} – ${end}`;
		return start ?? end;
	}

	const start = startAt ? new Date(startAt) : null;
	const end = endAt ? new Date(endAt) : null;

	if (start && end) {
		if (isSameDay(start, end)) {
			return `${format(start, dateFormat, opts)} ${format(start, timeFormat)} – ${format(end, timeFormat)}`;
		}
		return `${format(start, `${dateFormat} ${timeFormat}`, opts)} – ${format(end, `${dateFormat} ${timeFormat}`, opts)}`;
	}

	if (start) return format(start, `${dateFormat} ${timeFormat}`, opts);
	if (end) return format(end, `${dateFormat} ${timeFormat}`, opts);
	return null;
}

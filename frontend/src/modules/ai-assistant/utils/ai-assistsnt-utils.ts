import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { TaskStatus } from "@modules/tasks/types/task.types";
import type { PendingUpdate } from "../types/ai-assistant.types";

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
			return `${format(start, dateFormat, opts)}, ${format(start, timeFormat)} – ${format(end, timeFormat)}`;
		}
		return `${format(start, `${dateFormat}, ${timeFormat}`, opts)} – ${format(end, `${dateFormat}, ${timeFormat}`, opts)}`;
	}

	if (start) return format(start, `${dateFormat}, ${timeFormat}`, opts);
	if (end) return format(end, `${dateFormat}, ${timeFormat}`, opts);
	return null;
}

export interface UpdateField {
	label: string;
	value: string;
}

export function getPendingUpdateFields(update: PendingUpdate): UpdateField[] {
	const fields: UpdateField[] = [];

	if (update.title !== null) {
		fields.push({ label: "Название", value: update.title });
	}

	if (update.description !== null) {
		fields.push({ label: "Описание", value: update.description || "—" });
	}

	if (update.startAt !== null && update.endAt !== null) {
		const formatted = formatDateRange(update.startAt, update.endAt, update.isAllDay ?? false);
		if (formatted) fields.push({ label: "Дата", value: formatted });
	} else if (update.startAt !== null) {
		const formatted = formatDateRange(update.startAt, null, update.isAllDay ?? false);
		if (formatted) fields.push({ label: "Начало", value: formatted });
	} else if (update.endAt !== null) {
		const formatted = formatDateRange(null, update.endAt, update.isAllDay ?? false);
		if (formatted) fields.push({ label: "Конец", value: formatted });
	}

	if (update.isAllDay !== null) {
		fields.push({ label: "Весь день", value: update.isAllDay ? "Да" : "Нет" });
	}

	if (update.status !== null) {
		fields.push({
			label: "Статус",
			value: update.status === TaskStatus.Completed ? "Выполнена" : "В процессе",
		});
	}

	return fields;
}

"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Trash2, List, Flag } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Checkbox } from "@shared/ui/checkbox";
import { Label } from "@shared/ui/label";
import { Switch } from "@shared/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/select";
import { useTaskModal } from "../store/task-modal.store";
import { useTasksStore } from "../store/tasks.store";
import { useListsStore } from "@modules/lists/store/lists.store";
import { Spinner } from "@shared/ui/spinner";
import { TaskPriority } from "../types/task.types";

function toInputDateTime(date: Date | null | undefined): string {
	if (!date) return "";
	return format(date, "yyyy-MM-dd'T'HH:mm");
}

function toInputDate(date: Date | null | undefined): string {
	if (!date) return "";
	return format(date, "yyyy-MM-dd");
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
	{ value: TaskPriority.Low, label: "Низкий", color: "text-muted-foreground" },
	{ value: TaskPriority.Medium, label: "Средний", color: "text-yellow-500" },
	{ value: TaskPriority.High, label: "Высокий", color: "text-destructive" },
];

export function TaskModal() {
	const { isOpen, editingTask, prefill, close } = useTaskModal();
	const { addTask, updateTask, deleteTask } = useTasksStore();
	const lists = useListsStore((s) => s.lists);

	const [title, setTitle] = useState("");
	const [isCompleted, setIsCompleted] = useState(false);
	const [isAllDay, setIsAllDay] = useState(false);
	const [startValue, setStartValue] = useState("");
	const [endValue, setEndValue] = useState("");
	const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Low);
	const [listId, setListId] = useState<number | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (isOpen) {
			const allDay = editingTask?.isAllDay ?? false;
			setTitle(editingTask?.title ?? "");
			setIsCompleted(editingTask?.isCompleted ?? false);
			setIsAllDay(allDay);

			const rawStart = editingTask?.startDate ?? prefill?.startDate ?? null;
			const rawEnd = editingTask?.endDate ?? prefill?.endDate ?? null;

			if (allDay) {
				setStartValue(toInputDate(rawStart));
				setEndValue(toInputDate(rawEnd));
			} else {
				setStartValue(toInputDateTime(rawStart));
				setEndValue(toInputDateTime(rawEnd));
			}

			setPriority(editingTask?.priority ?? TaskPriority.Low);
			setListId(editingTask?.listId ?? prefill?.listId ?? null);
			setIsSaving(false);
			setIsDeleting(false);
		}
	}, [isOpen, editingTask, prefill]);

	const handleAllDayToggle = (checked: boolean) => {
		setIsAllDay(checked);
		if (checked) {
			// Convert datetime-local values to date-only
			if (startValue) {
				setStartValue(startValue.substring(0, 10));
			}
			setEndValue("");
		} else {
			// Convert date-only values to datetime-local
			if (startValue) {
				setStartValue(startValue + "T00:00");
			}
			if (endValue) {
				setEndValue(endValue + "T00:00");
			}
		}
	};

	const handleSave = async () => {
		const trimmed = title.trim();
		if (!trimmed) return;

		let startDate: Date | null = null;
		let endDate: Date | null = null;

		if (isAllDay) {
			if (startValue) {
				// Set time to midnight for the start date
				startDate = new Date(startValue + "T00:00:00");
				// End date is start date + 24 hours
				endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
			}
		} else {
			startDate = startValue ? new Date(startValue) : null;
			endDate = endValue ? new Date(endValue) : null;
		}

		setIsSaving(true);
		try {
			if (editingTask) {
				await updateTask(editingTask.id, {
					title: trimmed,
					isCompleted,
					isAllDay,
					startDate,
					endDate,
					priority,
					listId,
				});
			} else {
				await addTask(trimmed, startDate, endDate, null, isAllDay, listId, priority);
			}
			close();
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!editingTask) return;
		setIsDeleting(true);
		try {
			await deleteTask(editingTask.id);
			close();
		} finally {
			setIsDeleting(false);
		}
	};

	const isBusy = isSaving || isDeleting;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && !isBusy && close()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<div className="hidden">
						<DialogTitle />
					</div>
					<div className="flex items-start gap-3">
						<Checkbox
							id="modal-completed"
							checked={isCompleted}
							onCheckedChange={(v) => setIsCompleted(Boolean(v))}
							className="w-5 h-5 mt-[10px] shrink-0"
						/>
						<Input
							id="modal-title"
							placeholder="Название задачи"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="flex-1 outline-0 border-0 shadow-none text-[16px]! p-0 pt-0.5 font-bold"
							autoFocus
							onKeyDown={(e) => e.key === "Enter" && handleSave()}
						/>
					</div>
				</DialogHeader>

				<div className="flex flex-col gap-3 py-1">
					{/* All Day toggle */}
					<div className="flex items-center justify-between">
						<Label htmlFor="modal-all-day" className="text-sm cursor-pointer">
							Весь день
						</Label>
						<Switch id="modal-all-day" checked={isAllDay} onCheckedChange={handleAllDayToggle} />
					</div>

					{/* Schedule */}
					{isAllDay ? (
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="modal-start" className="text-xs text-muted-foreground">
								Дата
							</Label>
							<Input
								id="modal-start"
								type="date"
								value={startValue}
								onChange={(e) => setStartValue(e.target.value)}
								className="w-full text-sm"
							/>
						</div>
					) : (
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="modal-start" className="text-xs text-muted-foreground">
									Начало
								</Label>
								<Input
									id="modal-start"
									type="datetime-local"
									value={startValue}
									onChange={(e) => setStartValue(e.target.value)}
									className="w-full text-sm"
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="modal-end" className="text-xs text-muted-foreground">
									Конец
								</Label>
								<Input
									id="modal-end"
									type="datetime-local"
									value={endValue}
									onChange={(e) => setEndValue(e.target.value)}
									className="w-full text-sm"
								/>
							</div>
						</div>
					)}

					{/* List */}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
							<List size={12} />
							Список
						</Label>
						<Select
							value={listId !== null ? String(listId) : "inbox"}
							onValueChange={(v) => setListId(v === "inbox" ? null : Number(v))}
						>
							<SelectTrigger className="w-full text-sm">
								<SelectValue placeholder="Входящие" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="inbox">Входящие</SelectItem>
								{lists.map((l) => (
									<SelectItem key={l.id} value={String(l.id)}>
										<span className="flex items-center gap-2">
											<span
												className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
												style={{ backgroundColor: l.colorHex }}
											/>
											{l.name}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Priority */}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
							<Flag size={12} />
							Приоритет
						</Label>
						<div className="flex gap-2">
							{PRIORITY_OPTIONS.map((opt) => (
								<Button
									key={opt.value}
									type="button"
									variant={priority === opt.value ? "default" : "outline"}
									size="sm"
									className={`flex-1 text-sm ${priority !== opt.value ? opt.color : ""}`}
									onClick={() => setPriority(opt.value)}
								>
									{opt.label}
								</Button>
							))}
						</div>
					</div>
				</div>

				<DialogFooter>
					{editingTask && (
						<Button
							variant="ghost"
							size="icon"
							className="mr-auto text-destructive hover:text-destructive"
							onClick={handleDelete}
							disabled={isBusy}
						>
							{isDeleting ? <Spinner /> : <Trash2 size={16} />}
						</Button>
					)}
					<Button variant="outline" onClick={close} disabled={isBusy}>
						Отменить
					</Button>
					<Button onClick={handleSave} disabled={!title.trim() || isBusy}>
						{isSaving ? <Spinner /> : "Сохранить"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

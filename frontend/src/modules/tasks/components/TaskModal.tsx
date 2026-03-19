"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Checkbox } from "@shared/ui/checkbox";
import { Label } from "@shared/ui/label";
import { useTaskModal } from "../store/task-modal.store";
import { useTasksStore } from "../store/tasks.store";
import { Spinner } from "@shared/ui/spinner";

function toInputDate(date: Date | null | undefined): string {
	if (!date) return "";
	return format(date, "yyyy-MM-dd");
}

function toInputDateTime(date: Date | null | undefined): string {
	if (!date) return "";
	return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function TaskModal() {
	const { isOpen, editingTask, prefill, close } = useTaskModal();
	const { addTask, updateTask, deleteTask } = useTasksStore();

	const [title, setTitle] = useState("");
	const [isCompleted, setIsCompleted] = useState(false);
	const [dateValue, setDateValue] = useState("");
	const [startValue, setStartValue] = useState("");
	const [endValue, setEndValue] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const hasSchedule = Boolean(editingTask?.startDate ?? prefill?.startDate);

	useEffect(() => {
		if (isOpen) {
			setTitle(editingTask?.title ?? "");
			setIsCompleted(editingTask?.isCompleted ?? false);
			setDateValue(toInputDate(editingTask?.dueDate ?? null));
			setStartValue(toInputDateTime(editingTask?.startDate ?? prefill?.startDate ?? null));
			setEndValue(toInputDateTime(editingTask?.endDate ?? prefill?.endDate ?? null));
			setIsSaving(false);
			setIsDeleting(false);
		}
	}, [isOpen, editingTask, prefill]);

	const handleSave = async () => {
		const trimmed = title.trim();
		if (!trimmed) return;

		const dueDate = dateValue ? new Date(dateValue) : null;
		const startDate = startValue ? new Date(startValue) : null;
		const endDate = endValue ? new Date(endValue) : null;

		setIsSaving(true);
		try {
			if (editingTask) {
				await updateTask(editingTask.id, {
					title: trimmed,
					isCompleted,
					dueDate,
					startDate,
					endDate,
				});
			} else {
				await addTask(trimmed, dueDate, startDate, endDate, false, prefill?.listId);
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
						<DialogTitle></DialogTitle>
					</div>
					<div className="flex items-center gap-3">
						<Checkbox
							id="modal-completed"
							checked={isCompleted}
							onCheckedChange={(v) => setIsCompleted(Boolean(v))}
							className="w-5 h-5"
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

				<div className="flex flex-col gap-4 py-2">
					{hasSchedule && (
						<>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="modal-start" className="text-sm text-muted-foreground">
									Начало
								</Label>
								<Input
									id="modal-start"
									type="datetime-local"
									value={startValue}
									onChange={(e) => setStartValue(e.target.value)}
									className="w-full"
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="modal-end" className="text-sm text-muted-foreground">
									Конец
								</Label>
								<Input
									id="modal-end"
									type="datetime-local"
									value={endValue}
									onChange={(e) => setEndValue(e.target.value)}
									className="w-full"
								/>
							</div>
						</>
					)}

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="modal-date" className="text-sm text-muted-foreground">
							Дата исполнения
						</Label>
						<Input
							id="modal-date"
							type="date"
							value={dateValue}
							onChange={(e) => setDateValue(e.target.value)}
							className="w-full"
						/>
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

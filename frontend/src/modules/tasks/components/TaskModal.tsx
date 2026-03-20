"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Trash2, List, Flag } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Checkbox } from "@shared/ui/checkbox";
import { Label } from "@shared/ui/label";
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
	const [startValue, setStartValue] = useState("");
	const [endValue, setEndValue] = useState("");
	const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Low);
	const [listId, setListId] = useState<number | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setTitle(editingTask?.title ?? "");
			setIsCompleted(editingTask?.isCompleted ?? false);
			setStartValue(toInputDateTime(editingTask?.startDate ?? prefill?.startDate ?? null));
			setEndValue(toInputDateTime(editingTask?.endDate ?? prefill?.endDate ?? null));
			setPriority(editingTask?.priority ?? TaskPriority.Low);
			setListId(editingTask?.listId ?? prefill?.listId ?? null);
			setIsSaving(false);
			setIsDeleting(false);
		}
	}, [isOpen, editingTask, prefill]);

	const handleSave = async () => {
		const trimmed = title.trim();
		if (!trimmed) return;

		const startDate = startValue ? new Date(startValue) : null;
		const endDate = endValue ? new Date(endValue) : null;

		setIsSaving(true);
		try {
			if (editingTask) {
				await updateTask(editingTask.id, {
					title: trimmed,
					isCompleted,
					startDate,
					endDate,
					priority,
					listId,
				});
			} else {
				await addTask(trimmed, startDate, endDate, null, false, listId, priority);
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
					{/* Schedule */}
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

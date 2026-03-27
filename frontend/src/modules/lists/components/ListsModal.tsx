"use client";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/ui/dialog";
import { useListsModal } from "@modules/lists/store/lists-modal.store";
import { Input } from "@shared/ui/input";
import { Button } from "@shared/ui/button";
import { useListsStore } from "../store/lists.store";
import { toastMessage } from "@shared/toast/toast";
import { Spinner } from "@shared/ui/spinner";
import { GradientPicker } from "@shared/ui/gradient-picker";

const DEFAULT_LIST_COLOR = "#FFFFFF";
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function ListsModal() {
	const { isOpen, editingList, onClose } = useListsModal();
	const { createList, updateList, isLoading } = useListsStore();
	const [listName, setListName] = useState("");
	const [listColor, setListColor] = useState(DEFAULT_LIST_COLOR);

	const isEditing = useMemo(() => editingList !== null, [editingList]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		setListName(editingList?.name ?? "");
		setListColor(editingList?.colorHex ?? DEFAULT_LIST_COLOR);
	}, [editingList, isOpen]);

	const resetForm = () => {
		setListName("");
		setListColor(DEFAULT_LIST_COLOR);
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const handleSaveList = async () => {
		const trimmedListName = listName.trim();

		if (!trimmedListName) {
			toastMessage.showError("Введите название списка");
			return;
		}

		if (!HEX_COLOR_REGEX.test(listColor)) {
			toastMessage.showError("Выберите корректный цвет в формате HEX");
			return;
		}

		try {
			if (editingList) {
				await updateList(editingList.id, {
					name: trimmedListName,
					colorHex: listColor,
				});
			} else {
				await createList({
					name: trimmedListName,
					colorHex: listColor,
				});
			}

			handleClose();
		} catch {
			toastMessage.showError(
				isEditing ? "Ошибка при обновлении списка" : "Ошибка при создании списка",
			);
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					handleClose();
				}
			}}
		>
			<DialogContent className="w-[429px]">
				<DialogHeader>
					<DialogTitle className="text-[22px] font-bold">
						{isEditing ? "Редактировать список" : "Создать список"}
					</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-[18px]">
					<div className="flex flex-col gap-[10px] w-full">
						<label htmlFor="list-name" className="text-[18px]">
							Название списка
						</label>
						<Input
							id="list-name"
							placeholder="Введите название списка"
							className="w-full"
							value={listName}
							onChange={(event) => setListName(event.target.value)}
						/>
					</div>
					<div className="flex w-full items-center justify-between gap-4">
						<label className="text-[18px]">Цвет</label>
						<GradientPicker
							background={listColor}
							setBackground={setListColor}
							hexOnly
							showValue={false}
							className="h-[34px] w-[291px] rounded-[4px] border border-secondary p-0"
						/>
					</div>
					<div className="flex gap-[18px] w-full">
						<Button className="flex-1" variant="ghost" onClick={handleClose} disabled={isLoading}>
							Отмена
						</Button>
						<Button
							className="flex-1"
							variant="secondary"
							onClick={handleSaveList}
							disabled={isLoading}
						>
							{isEditing ? "Сохранить" : "Создать"}
							{isLoading && <Spinner />}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

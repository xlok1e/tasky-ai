"use client";

import { usePathname, useRouter } from "next/navigation";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@shared/ui/dialog";
import { Button } from "@shared/ui/button";
import { Spinner } from "@shared/ui/spinner";
import { toastMessage } from "@shared/toast/toast";
import { useDeleteListModal } from "@modules/lists/store/delete-list-modal.store";
import { useListsStore } from "@modules/lists/store/lists.store";

export function DeleteListModal() {
	const pathname = usePathname();
	const router = useRouter();
	const { isOpen, listToDelete, onClose } = useDeleteListModal();
	const deleteList = useListsStore((state) => state.deleteList);
	const isLoading = useListsStore((state) => state.isLoading);

	const handleDelete = async () => {
		if (!listToDelete) {
			return;
		}

		try {
			await deleteList(listToDelete.id);

			if (pathname === `/lists/${listToDelete.id}`) {
				router.push("/inbox");
			}

			onClose();
		} catch {
			toastMessage.showError("Не удалось удалить список");
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onClose();
				}
			}}
		>
			<DialogContent className="w-[429px]">
				<DialogHeader className="gap-2">
					<DialogTitle className="text-[22px] font-bold">Удалить список?</DialogTitle>
					<DialogDescription className="text-[16px] leading-6 text-muted-foreground">
						{`Список "${listToDelete?.name ?? ""}" будет удален без возможности восстановления. Все задачи внутри этого списка тоже будут удалены.`}
					</DialogDescription>
				</DialogHeader>

				<div className="flex gap-[18px] w-full">
					<Button
						className="flex-1"
						variant="destructive"
						onClick={handleDelete}
						disabled={isLoading || listToDelete === null}
					>
						Удалить
						{isLoading && <Spinner />}
					</Button>
					<Button className="flex-1" variant="secondary" onClick={onClose} disabled={isLoading}>
						Отмена
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

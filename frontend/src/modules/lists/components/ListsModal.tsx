"use client";
import { Dialog, DialogContent, DialogHeader } from "@shared/ui/dialog";
import { useListsModal } from "@modules/lists/store/lists-modal.store";
import { Input } from "@shared/ui/input";
import { Button } from "@shared/ui/button";
import { useState } from "react";
import { useListsStore } from "../store/lists.store";
import { toastMessage } from "@shared/toast/toast";
import { Spinner } from "@shared/ui/spinner";

export function ListsModal() {
  const { isOpen, onOpen, onClose } = useListsModal();
  const { createList, isLoading } = useListsStore();
  const [listName, setListName] = useState("");
  const [listColor, setListColor] = useState("#FFFFFF");

  const handleCreateList = async () => {
    if (listName.trim()) {
      try {
        await createList({ name: listName, colorHex: listColor });
        onClose();
      } catch (error) {
        toastMessage.showError("Ошибка при создании списка");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isOpen ? onClose : onOpen}>
      <DialogContent className="w-[429px]">
        <DialogHeader>
          <label className="text-[22px] font-bold">Создать список</label>
        </DialogHeader>
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-[10px] w-full">
            <label className="text-[18px]">Название списка</label>
            <Input
              placeholder="Введите название списка"
              className="w-full"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
            />
          </div>
          <div className="flex w-full justify-between">
            <label className="text-[18px]">Цвет</label>
            <div className="w-[291px] h-[34px] rounded-[4px] border border-secondary" />
          </div>
          <div className="flex gap-[18px] w-full">
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => handleCreateList()}
            >
              Сохранить
              {isLoading && <Spinner />}
            </Button>
            <Button className="flex-1" variant="secondary">
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

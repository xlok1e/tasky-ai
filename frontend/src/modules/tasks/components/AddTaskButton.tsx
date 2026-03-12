"use client";

import { Plus } from "lucide-react";
import { Button } from "ui/button";
import { useTaskModal } from "../store/task-modal.store";

export function AddTaskButton() {
  const openNew = useTaskModal((s) => s.openNew);

  return (
    <Button variant="outline" className="w-fit gap-2" onClick={openNew}>
      <Plus size={16} />
      Добавить задачу
    </Button>
  );
}

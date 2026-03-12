"use client";

import { Plus } from "lucide-react";
import { Button } from "ui/button";

export function AddTaskButton() {
  return (
    <Button variant="outline" className="w-fit gap-2" disabled>
      <Plus size={16} />
      Добавить задачу
    </Button>
  );
}

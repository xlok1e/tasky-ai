"use client";

import { use } from "react";
import { useListsStore } from "@modules/lists/store/lists.store";
import { AddTaskButton } from "@modules/tasks/components/AddTaskButton";
import { TaskList } from "@modules/tasks/components/TaskList";

interface ListPageProps {
  params: Promise<{ id: string }>;
}

export default function ListPage({ params }: ListPageProps) {
  const { id } = use(params);
  const listId = Number(id);

  const list = useListsStore((s) => s.lists.find((l) => l.id === listId));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{list?.name ?? "Список"}</h1>
      <AddTaskButton listId={listId} />
      <TaskList listId={listId} />
    </div>
  );
}

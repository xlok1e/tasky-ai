"use client";

import { use } from "react";
import { TaskList } from "@modules/tasks/components/TaskList";

interface ListPageProps {
  params: Promise<{ id: string }>;
}

export default function ListPage({ params }: ListPageProps) {
  const { id } = use(params);
  const listId = Number(id);

  return (
    <div className="flex flex-col">
      <TaskList listId={listId} />
    </div>
  );
}

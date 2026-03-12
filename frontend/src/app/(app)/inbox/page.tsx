import { AddTaskButton } from "@modules/tasks/components/AddTaskButton";
import { TaskList } from "@modules/tasks/components/TaskList";

export default function InboxPage() {
	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<h1 className="text-2xl font-semibold">Входящие задачи</h1>
			<AddTaskButton />
			<TaskList />
		</div>
	);
}

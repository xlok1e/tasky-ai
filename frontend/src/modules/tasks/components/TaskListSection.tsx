import { TaskListSectionProps } from "../types/task.types";
import { TaskRow } from "./TaskRow";

export function TaskListSection({ title, tasks }: TaskListSectionProps) {
	return (
		<section className="flex w-full flex-col gap-6">
			<h2 className="text-[22px] leading-6 font-normal text-foreground">
				{title}: {tasks.length}
			</h2>
			<div className="flex w-full flex-col gap-1.5">
				{tasks.length === 0 ? (
					<p className="text-base leading-7 text-muted-foreground">Нет задач</p>
				) : (
					tasks.map((task) => <TaskRow key={task.id} task={task} />)
				)}
			</div>
		</section>
	);
}

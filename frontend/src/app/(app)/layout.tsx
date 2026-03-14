import { Sidebar } from "@components/sidebar/Sidebar";
import { TaskModal } from "@modules/tasks/components/TaskModal";
import { AuthInitializer } from "@domains/auth/components/AuthInitializer";
import { TasksInitializer } from "@modules/tasks/components/TasksInitializer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-screen overflow-hidden">
			<AuthInitializer />
			<TasksInitializer />
			<Sidebar />
			<main className="flex-1 overflow-y-auto p-6">{children}</main>
			<TaskModal />
		</div>
	);
}

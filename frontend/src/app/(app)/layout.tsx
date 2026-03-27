import { Sidebar } from "@components/sidebar/Sidebar";
import { RightSidebar } from "@components/right-sidebar/RightSidebar";
import { TaskModal } from "@modules/tasks/components/TaskModal";
import { AuthInitializer } from "@domains/auth/components/AuthInitializer";
import { TasksInitializer } from "@modules/tasks/components/TasksInitializer";
import { ListsInitializer } from "@modules/lists/components/ListsInitializer";
import { GoogleInitializer } from "@/domains/google/components/GoogleInitializer";
import { UserInitializer } from "@/domains/user/components/UserInitializer";
import { DeleteListModal, ListsModal } from "@modules/lists";
import { GoogleSyncObserver } from "@/domains/google/components/GoogleSyncObserver";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-screen overflow-hidden">
			<AuthInitializer />
			<TasksInitializer />
			<ListsInitializer />
			<GoogleInitializer />
			<UserInitializer />
			<GoogleSyncObserver />
			<Sidebar />
			<main className="flex-1 overflow-y-auto p-6">{children}</main>
			<RightSidebar />
			<TaskModal />
		 <ListsModal />
      <DeleteListModal />
		</div>
	);

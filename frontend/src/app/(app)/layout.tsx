import { Sidebar } from "@components/sidebar/Sidebar";
import { TaskModal } from "@modules/tasks/components/TaskModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
      <TaskModal />
    </div>
  );
}

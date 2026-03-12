export interface Task {
  id: string;
  title: string;
  dueDate: Date | null;
  isCompleted: boolean;
}

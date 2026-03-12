export interface Task {
  id: string;
  title: string;
  dueDate: Date | null;
  isCompleted: boolean;
  isAllDay: boolean;
  startDate: Date | null;
  endDate: Date | null;
}

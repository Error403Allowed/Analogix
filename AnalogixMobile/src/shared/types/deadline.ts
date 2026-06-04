export type DeadlinePriority = "low" | "medium" | "high";

export interface Deadline {
  id: string;
  user_id: string;
  title: string;
  due_date: string;
  subject?: string | null;
  priority: DeadlinePriority;
  created_at: string;
}

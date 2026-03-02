import { createClient } from "@/lib/supabase/client";

export interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  subject?: string;
  priority: "low" | "medium" | "high";
}

export const deadlineStore = {
  getAll: async (): Promise<Deadline[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("deadlines")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    if (error) {
      console.warn("[deadlineStore] getAll failed:", error);
      return [];
    }
    return (data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      dueDate: row.due_date,
      subject: row.subject,
      priority: row.priority,
    }));
  },

  add: async (d: Omit<Deadline, "id">): Promise<Deadline> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("deadlines")
      .insert({
        user_id: user.id,
        title: d.title,
        due_date: d.dueDate,
        subject: d.subject,
        priority: d.priority,
      })
      .select()
      .single();

    if (error || !data) {
      console.warn("[deadlineStore] add failed:", error);
      throw error;
    }

    const item: Deadline = { id: data.id, title: data.title, dueDate: data.due_date, subject: data.subject, priority: data.priority };
    window.dispatchEvent(new Event("deadlinesUpdated"));
    return item;
  },

  remove: async (id: string): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("deadlines").delete().eq("id", id).eq("user_id", user.id);
    window.dispatchEvent(new Event("deadlinesUpdated"));
  },
};

import { createClient } from "@/lib/supabase/client";

const LOCAL_KEY = "userDeadlines";

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

    if (user) {
      const { data } = await supabase
        .from("deadlines")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });
      if (data) {
        return data.map((row: any) => ({
          id: row.id, title: row.title, dueDate: row.due_date,
          subject: row.subject, priority: row.priority,
        }));
      }
    }

    try {
      const s = typeof window !== "undefined" && localStorage.getItem(LOCAL_KEY);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  },

  add: async (d: Omit<Deadline, "id">): Promise<Deadline> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const id = crypto.randomUUID();
    const item: Deadline = { ...d, id };

    if (user) {
      const { data } = await supabase.from("deadlines").insert({
        user_id: user.id, title: d.title, due_date: d.dueDate,
        subject: d.subject, priority: d.priority,
      }).select().single();
      if (data) item.id = data.id;
    }

    try {
      const all = await deadlineStore.getAll();
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...all, item]));
    } catch {}
    window.dispatchEvent(new Event("deadlinesUpdated"));
    return item;
  },

  remove: async (id: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("deadlines").delete().eq("id", id).eq("user_id", user.id);
    }

    try {
      const all = await deadlineStore.getAll();
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all.filter(d => d.id !== id)));
    } catch {}
    window.dispatchEvent(new Event("deadlinesUpdated"));
  },
};

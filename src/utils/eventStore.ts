import { createClient } from "@/lib/supabase/client";
import { AppEvent } from "@/types/events";

const LOCAL_KEY = "userEvents";

export const eventStore = {
  getAll: async (): Promise<AppEvent[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          title: row.title,
          date: new Date(row.date),
          type: row.type as AppEvent["type"],
          subject: row.subject,
          description: row.description,
          source: (row.source ?? "import") as AppEvent["source"],
        }));
      }
      if (error) {
        console.warn("[eventStore] Supabase getAll failed:", error);
      }
    }

    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (!stored) return [];
      return JSON.parse(stored).map((e: any) => ({ ...e, date: new Date(e.date) }));
    } catch { return []; }
  },

  add: async (event: AppEvent) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from("events").insert({
        user_id: user.id,
        title: event.title,
        date: event.date,
        type: event.type,
        subject: event.subject,
        description: event.description,
        source: event.source,
      });
      if (error) {
        console.warn("[eventStore] Supabase add failed:", error);
      }
    }

    try {
      const events = await eventStore.getAll();
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...events, event]));
    } catch {}
    window.dispatchEvent(new Event("eventsUpdated"));
  },

  addMultiple: async (newEvents: AppEvent[]) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from("events").insert(
        newEvents.map(e => ({
          user_id: user.id,
          title: e.title,
          date: e.date,
          type: e.type,
          subject: e.subject,
          description: e.description,
          source: e.source,
        }))
      );
      if (error) {
        console.warn("[eventStore] Supabase addMultiple failed:", error);
      }
    }

    try {
      const existing = await eventStore.getAll();
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...existing, ...newEvents]));
    } catch {}
    window.dispatchEvent(new Event("eventsUpdated"));
  },

  remove: async (id: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("events").delete().eq("id", id).eq("user_id", user.id);
    }

    try {
      const events = await eventStore.getAll();
      localStorage.setItem(LOCAL_KEY, JSON.stringify(events.filter(e => e.id !== id)));
    } catch {}
    window.dispatchEvent(new Event("eventsUpdated"));
  },
};

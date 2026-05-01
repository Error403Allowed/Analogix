/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "./authCache";
import { AppEvent } from "@/types/events";
import { toast } from "sonner";

export const eventStore = {
  getAll: async (): Promise<AppEvent[]> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return [];

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (error) {
      console.warn("[eventStore] getAll failed:", error);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      date: new Date(row.date),
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      type: row.type as string,
      subject: row.subject,
      description: row.description,
      source: (row.source ?? "import") as AppEvent["source"],
    }));
  },

  add: async (event: AppEvent): Promise<void> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return;

    const { error } = await supabase.from("events").insert({
      user_id: user.id,
      title: event.title,
      date: event.date,
      end_date: event.endDate ?? null,
      type: event.type,
      subject: event.subject,
      description: event.description,
      source: event.source,
    });
    if (error) {
      console.warn("[eventStore] add failed:", error);
      toast.error("Failed to add event");
      return;
    }
    window.dispatchEvent(new Event("eventsUpdated"));
  },

  addMultiple: async (newEvents: AppEvent[]): Promise<void> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return;

    const { error } = await supabase.from("events").insert(
      newEvents.map(e => ({
        user_id: user.id,
        title: e.title,
        date: e.date,
        end_date: e.endDate ?? null,
        type: e.type,
        subject: e.subject,
        description: e.description,
        source: e.source,
      }))
    );
    if (error) {
      console.warn("[eventStore] addMultiple failed:", error);
      toast.error("Failed to add events");
      return;
    }
    window.dispatchEvent(new Event("eventsUpdated"));
  },

  update: async (
    id: string,
    updates: Partial<Pick<AppEvent, "title" | "date" | "endDate" | "type" | "subject" | "description">>,
  ): Promise<void> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return;

    const payload: Record<string, unknown> = {};

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.endDate !== undefined) payload.end_date = updates.endDate ?? null;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.subject !== undefined) payload.subject = updates.subject ?? null;
    if (updates.description !== undefined) payload.description = updates.description ?? null;

    const { error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.warn("[eventStore] update failed:", error);
      toast.error("Failed to update event");
      return;
    }

    window.dispatchEvent(new Event("eventsUpdated"));
  },

  remove: async (id: string): Promise<void> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return;

    const { error } = await supabase.from("events").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      console.warn("[eventStore] remove failed:", error);
      toast.error("Failed to delete event");
      return;
    }
    toast.success("Event deleted");
    window.dispatchEvent(new Event("eventsUpdated"));
  },

  clearAll: async (): Promise<void> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return;

    const { error } = await supabase.from("events").delete().eq("user_id", user.id);
    if (error) {
      console.warn("[eventStore] clearAll failed:", error);
      toast.error("Failed to clear events");
      return;
    }
    window.dispatchEvent(new Event("eventsUpdated"));
  },
};

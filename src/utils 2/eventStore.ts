import { AppEvent } from "@/types/events";

const STORAGE_KEY = "userEvents";

export const eventStore = {
  getAll: (): AppEvent[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      // Reconstitute Date objects
      return parsed.map((e: any) => ({ ...e, date: new Date(e.date) }));
    } catch {
      return [];
    }
  },

  add: (event: AppEvent) => {
    const events = eventStore.getAll();
    events.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    // Trigger a custom event for real-time updates across components
    window.dispatchEvent(new Event("eventsUpdated"));
  },

  addMultiple: (newEvents: AppEvent[]) => {
    const events = eventStore.getAll();
    const updated = [...events, ...newEvents];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("eventsUpdated"));
  },

  remove: (id: string) => {
    const events = eventStore.getAll();
    const filtered = events.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event("eventsUpdated"));
  }
};

// Separate store for user-added deadlines (distinct from calendar events)
const KEY = "userDeadlines";

export interface Deadline {
  id: string;
  title: string;
  dueDate: string; // ISO string
  subject?: string;
  priority: "low" | "medium" | "high";
}

export const deadlineStore = {
  getAll: (): Deadline[] => {
    try {
      const s = typeof window !== "undefined" && localStorage.getItem(KEY);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  },

  add: (d: Omit<Deadline, "id">): Deadline => {
    const item: Deadline = { ...d, id: crypto.randomUUID() };
    const all = deadlineStore.getAll();
    all.push(item);
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("deadlinesUpdated"));
    return item;
  },

  remove: (id: string) => {
    const filtered = deadlineStore.getAll().filter(d => d.id !== id);
    localStorage.setItem(KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event("deadlinesUpdated"));
  },
};

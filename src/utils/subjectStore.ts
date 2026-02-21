"use client";

import { createClient } from "@/lib/supabase/client";

export interface SubjectMark {
  id: string;
  title: string;
  score: number;
  total: number;
  date: string;
}

export interface SubjectNotes {
  content: string;
  lastUpdated: string;
}

export interface SubjectData {
  id: string;
  marks: SubjectMark[];
  notes: SubjectNotes;
}

const LOCAL_KEY = "analogix-subject-data";

const emptySubject = (subjectId: string): SubjectData => ({
  id: subjectId, marks: [], notes: { content: "", lastUpdated: new Date().toISOString() },
});

export const subjectStore = {
  getAll: async (): Promise<Record<string, SubjectData>> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("subject_data")
        .select("*")
        .eq("user_id", user.id);
      if (data) {
        return data.reduce((acc: Record<string, SubjectData>, row: any) => {
          acc[row.subject_id] = {
            id: row.subject_id,
            marks: row.marks ?? [],
            notes: row.notes ?? { content: "", lastUpdated: "" },
          };
          return acc;
        }, {});
      }
    }

    try {
      if (typeof window === "undefined") return {};
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
    } catch { return {}; }
  },

  getSubject: async (subjectId: string): Promise<SubjectData> => {
    const all = await subjectStore.getAll();
    return all[subjectId] || emptySubject(subjectId);
  },

  saveSubject: async (subjectId: string, data: Partial<SubjectData>) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const current = await subjectStore.getSubject(subjectId);
    const updated = { ...current, ...data };

    if (user) {
      await supabase.from("subject_data").upsert({
        user_id: user.id,
        subject_id: subjectId,
        marks: updated.marks,
        notes: updated.notes,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,subject_id" });
    }

    try {
      const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
      all[subjectId] = updated;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    } catch {}
    window.dispatchEvent(new Event("subjectDataUpdated"));
  },

  addMark: async (subjectId: string, mark: Omit<SubjectMark, "id">) => {
    const current = await subjectStore.getSubject(subjectId);
    const newMark = { ...mark, id: crypto.randomUUID() };
    await subjectStore.saveSubject(subjectId, { marks: [...current.marks, newMark] });
  },

  updateNotes: async (subjectId: string, content: string) => {
    await subjectStore.saveSubject(subjectId, {
      notes: { content, lastUpdated: new Date().toISOString() },
    });
  },
};

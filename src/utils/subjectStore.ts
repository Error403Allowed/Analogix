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
  homework?: SubjectHomework[];
  links?: SubjectLink[];
  title?: string;
  documents?: SubjectDocumentItem[];
}

export interface SubjectData {
  id: string;
  marks: SubjectMark[];
  notes: SubjectNotes;
}

export interface SubjectDocumentItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  lastUpdated: string;
}

export interface SubjectHomework {
  id: string;
  title: string;
  dueDate?: string;
  notes?: string;
  link?: string;
  completed?: boolean;
  createdAt: string;
}

export interface SubjectLink {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

const LOCAL_KEY = "analogix-subject-data";

const emptySubject = (subjectId: string): SubjectData => ({
  id: subjectId,
  marks: [],
  notes: {
    content: "",
    lastUpdated: new Date().toISOString(),
    homework: [],
    links: [],
    documents: [],
  },
});

const normalizeDocuments = (
  subjectId: string,
  notes: SubjectNotes | undefined,
): SubjectDocumentItem[] => {
  if (!notes) return [];
  const legacyContent = notes.content || "";
  const legacyTitle = typeof notes.title === "string" ? notes.title : "";
  const legacyUpdated = notes.lastUpdated || new Date().toISOString();

  if (Array.isArray(notes.documents) && notes.documents.length > 0) {
    return notes.documents.map((doc, index) => ({
      id: doc?.id || `legacy-${subjectId}-${index}`,
      title: typeof doc?.title === "string" ? doc.title : "",
      content: doc?.content || "",
      createdAt: doc?.createdAt || legacyUpdated,
      lastUpdated: doc?.lastUpdated || legacyUpdated,
    }));
  }

  if (legacyContent || legacyTitle) {
    return [
      {
        id: `legacy-${subjectId}`,
        title: legacyTitle,
        content: legacyContent,
        createdAt: legacyUpdated,
        lastUpdated: legacyUpdated,
      },
    ];
  }

  return [];
};

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
          const notes = row.notes ?? { content: "", lastUpdated: "" };
          const documents = normalizeDocuments(row.subject_id, notes);
          acc[row.subject_id] = {
            id: row.subject_id,
            marks: row.marks ?? [],
      notes: {
        content: notes.content || "",
        lastUpdated: notes.lastUpdated || "",
        homework: Array.isArray(notes.homework) ? notes.homework : [],
        links: Array.isArray(notes.links) ? notes.links : [],
        title: typeof notes.title === "string" ? notes.title : "",
        documents,
      },
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
    const stored = all[subjectId];
    if (!stored) return emptySubject(subjectId);
    const documents = normalizeDocuments(subjectId, stored.notes);
    return {
      ...stored,
      notes: {
        content: stored.notes?.content || "",
        lastUpdated: stored.notes?.lastUpdated || "",
        homework: Array.isArray(stored.notes?.homework) ? stored.notes.homework : [],
        links: Array.isArray(stored.notes?.links) ? stored.notes.links : [],
        title: typeof stored.notes?.title === "string" ? stored.notes.title : "",
        documents,
      },
    };
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

  updateNotes: async (subjectId: string, content: string, title?: string) => {
    const current = await subjectStore.getSubject(subjectId);
    await subjectStore.saveSubject(subjectId, {
      notes: {
        ...current.notes,
        content,
        title: typeof title === "string" ? title : current.notes.title,
        lastUpdated: new Date().toISOString(),
      },
    });
  },

  createDocument: async (subjectId: string, title?: string) => {
    const current = await subjectStore.getSubject(subjectId);
    const now = new Date().toISOString();
    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const newDoc: SubjectDocumentItem = {
      id: crypto.randomUUID(),
      title: normalizedTitle,
      content: "",
      createdAt: now,
      lastUpdated: now,
    };
    const documents = [newDoc, ...(current.notes.documents || [])];
    await subjectStore.saveSubject(subjectId, {
      notes: {
        ...current.notes,
        documents,
        lastUpdated: now,
      },
    });
    return newDoc;
  },

  updateDocument: async (subjectId: string, docId: string, updates: Partial<SubjectDocumentItem>) => {
    const current = await subjectStore.getSubject(subjectId);
    const now = new Date().toISOString();
    const documents = current.notes.documents || [];
    const target = documents.find((doc) => doc.id === docId);
    if (!target) return;
    const updated: SubjectDocumentItem = {
      ...target,
      ...updates,
      lastUpdated: now,
    };
    const next = [updated, ...documents.filter((doc) => doc.id !== docId)];
    await subjectStore.saveSubject(subjectId, {
      notes: {
        ...current.notes,
        documents: next,
        lastUpdated: now,
      },
    });
  },

  removeDocument: async (subjectId: string, docId: string) => {
    const current = await subjectStore.getSubject(subjectId);
    const documents = (current.notes.documents || []).filter((doc) => doc.id !== docId);
    await subjectStore.saveSubject(subjectId, {
      notes: {
        ...current.notes,
        documents,
        lastUpdated: new Date().toISOString(),
      },
    });
  },

  updateHomework: async (subjectId: string, homework: SubjectHomework[]) => {
    const current = await subjectStore.getSubject(subjectId);
    await subjectStore.saveSubject(subjectId, {
      notes: {
        ...current.notes,
        homework,
        lastUpdated: new Date().toISOString(),
      },
    });
  },

  updateLinks: async (subjectId: string, links: SubjectLink[]) => {
    const current = await subjectStore.getSubject(subjectId);
    await subjectStore.saveSubject(subjectId, {
      notes: {
        ...current.notes,
        links,
        lastUpdated: new Date().toISOString(),
      },
    });
  },
};

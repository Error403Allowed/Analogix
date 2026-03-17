"use client";

import { createClient } from "@/lib/supabase/client";
import type { SubjectColorId } from "@/components/ColorPicker";

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
  assessments?: AssessmentNotification[];
}

export interface SubjectData {
  id: string;
  marks: SubjectMark[];
  notes: SubjectNotes;
}

export interface CustomSubject {
  id: string;
  user_id: string;
  subject_id: string;
  custom_icon: string | null;
  custom_color: SubjectColorId | null;
  custom_cover: string | null;
  custom_title: string | null;
  created_at: string;
  updated_at: string;
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

export interface AssessmentNotification {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  createdAt: string;
  studyGuide: StudyGuideWeek[];
  rawText: string;
}

export interface StudyGuideWeek {
  week: number;
  label: string;
  tasks: string[];
}

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

const normalizeDocuments = (subjectId: string, notes: SubjectNotes | undefined): SubjectDocumentItem[] => {
  if (!notes) return [];
  if (Array.isArray(notes.documents) && notes.documents.length > 0) {
    return notes.documents.map((doc, i) => ({
      id: doc?.id || `legacy-${subjectId}-${i}`,
      title: typeof doc?.title === "string" ? doc.title : "",
      content: doc?.content || "",
      createdAt: doc?.createdAt || notes.lastUpdated,
      lastUpdated: doc?.lastUpdated || notes.lastUpdated,
    }));
  }
  const legacyContent = notes.content || "";
  const legacyTitle = typeof notes.title === "string" ? notes.title : "";
  if (legacyContent || legacyTitle) {
    return [{
      id: `legacy-${subjectId}`,
      title: legacyTitle,
      content: legacyContent,
      createdAt: notes.lastUpdated,
      lastUpdated: notes.lastUpdated,
    }];
  }
  return [];
};

const normalizeNotes = (subjectId: string, notes: SubjectNotes | undefined): SubjectNotes => ({
  content: notes?.content || "",
  lastUpdated: notes?.lastUpdated || new Date().toISOString(),
  homework: Array.isArray(notes?.homework) ? notes!.homework : [],
  links: Array.isArray(notes?.links) ? notes!.links : [],
  title: typeof notes?.title === "string" ? notes.title : "",
  documents: normalizeDocuments(subjectId, notes),
  assessments: Array.isArray(notes?.assessments) ? notes!.assessments : [],
});

export const subjectStore = {
  getAll: async (): Promise<Record<string, SubjectData>> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    // Add cache-busting to prevent browser caching
    const { data, error } = await supabase
      .from("subject_data")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("[subjectStore] getAll failed:", error);
      return {};
    }

    console.log("[subjectStore] getAll - fetched rows:", data?.length || 0);
    if (data && data.length > 0) {
      data.forEach(row => {
        const docs = row.notes?.documents || [];
        console.log(`[subjectStore] getAll - ${row.subject_id}: ${docs.length} documents`);
        if (docs.length > 0) {
          docs.forEach((d: any, i: number) => {
            console.log(`  [subjectStore]   doc ${i}: "${d.title}" - content length: ${d.content?.length || 0}`);
          });
        }
      });
    }

    return (data ?? []).reduce((acc: Record<string, SubjectData>, row: any) => {
      acc[row.subject_id] = {
        id: row.subject_id,
        marks: row.marks ?? [],
        notes: normalizeNotes(row.subject_id, row.notes),
      };
      return acc;
    }, {});
  },

  getSubject: async (subjectId: string): Promise<SubjectData> => {
    const all = await subjectStore.getAll();
    const stored = all[subjectId];
    if (!stored) return emptySubject(subjectId);
    return { ...stored, notes: normalizeNotes(subjectId, stored.notes) };
  },

  saveSubject: async (subjectId: string, data: Partial<SubjectData>): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const current = await subjectStore.getSubject(subjectId);
    const updated = { ...current, ...data };

    const { error } = await supabase.from("subject_data").upsert({
      user_id: user.id,
      subject_id: subjectId,
      marks: updated.marks,
      notes: updated.notes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,subject_id" });

    if (error) console.warn("[subjectStore] saveSubject failed:", error);
    window.dispatchEvent(new Event("subjectDataUpdated"));
  },

  addMark: async (subjectId: string, mark: Omit<SubjectMark, "id">): Promise<void> => {
    const current = await subjectStore.getSubject(subjectId);
    await subjectStore.saveSubject(subjectId, { marks: [...current.marks, { ...mark, id: crypto.randomUUID() }] });
  },

  updateNotes: async (subjectId: string, content: string, title?: string): Promise<void> => {
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

  createDocument: async (subjectId: string, title?: string): Promise<SubjectDocumentItem> => {
    const current = await subjectStore.getSubject(subjectId);
    const now = new Date().toISOString();
    const newDoc: SubjectDocumentItem = {
      id: crypto.randomUUID(),
      title: typeof title === "string" ? title.trim() : "",
      content: "",
      createdAt: now,
      lastUpdated: now,
    };
    await subjectStore.saveSubject(subjectId, {
      notes: { ...current.notes, documents: [newDoc, ...(current.notes.documents || [])], lastUpdated: now },
    });
    return newDoc;
  },

  updateDocument: async (subjectId: string, docId: string, updates: Partial<SubjectDocumentItem>): Promise<void> => {
    const current = await subjectStore.getSubject(subjectId);
    const now = new Date().toISOString();
    const docs = current.notes.documents || [];
    const target = docs.find(d => d.id === docId);
    if (!target) return;
    const updated: SubjectDocumentItem = { ...target, ...updates, lastUpdated: now };
    await subjectStore.saveSubject(subjectId, {
      notes: { ...current.notes, documents: [updated, ...docs.filter(d => d.id !== docId)], lastUpdated: now },
    });
  },

  removeDocument: async (subjectId: string, docId: string): Promise<void> => {
    const current = await subjectStore.getSubject(subjectId);
    await subjectStore.saveSubject(subjectId, {
      notes: {
        ...current.notes,
        documents: (current.notes.documents || []).filter(d => d.id !== docId),
        lastUpdated: new Date().toISOString(),
      },
    });
  },

  updateHomework: async (subjectId: string, homework: SubjectHomework[]): Promise<void> => {
    const current = await subjectStore.getSubject(subjectId);
    await subjectStore.saveSubject(subjectId, {
      notes: { ...current.notes, homework, lastUpdated: new Date().toISOString() },
    });
  },

  updateLinks: async (subjectId: string, links: SubjectLink[]): Promise<void> => {
    const current = await subjectStore.getSubject(subjectId);
    await subjectStore.saveSubject(subjectId, {
      notes: { ...current.notes, links, lastUpdated: new Date().toISOString() },
    });
  },

  addAssessment: async (subjectId: string, assessment: AssessmentNotification): Promise<void> => {
    const current = await subjectStore.getSubject(subjectId);
    const existing = current.notes.assessments || [];
    await subjectStore.saveSubject(subjectId, {
      notes: { ...current.notes, assessments: [assessment, ...existing], lastUpdated: new Date().toISOString() },
    });
  },

  removeAssessment: async (subjectId: string, assessmentId: string): Promise<void> => {
    const current = await subjectStore.getSubject(subjectId);
    const filtered = (current.notes.assessments || []).filter(a => a.id !== assessmentId);
    await subjectStore.saveSubject(subjectId, {
      notes: { ...current.notes, assessments: filtered, lastUpdated: new Date().toISOString() },
    });
  },

  // Custom subject appearance methods
  getCustomSubject: async (subjectId: string): Promise<CustomSubject | null> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("custom_subjects")
      .select("*")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .single();

    if (error || !data) return null;
    return data;
  },

  saveCustomSubject: async (subjectId: string, updates: Partial<CustomSubject>): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const current = await subjectStore.getCustomSubject(subjectId);
    
    if (current) {
      const { error } = await supabase
        .from("custom_subjects")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("subject_id", subjectId);

      if (error) console.warn("[subjectStore] saveCustomSubject update failed:", error);
    } else {
      const { error } = await supabase
        .from("custom_subjects")
        .insert({
          user_id: user.id,
          subject_id: subjectId,
          ...updates,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) console.warn("[subjectStore] saveCustomSubject insert failed:", error);
    }
    
    window.dispatchEvent(new Event("customSubjectsUpdated"));
  },

  getAllCustomSubjects: async (): Promise<Record<string, CustomSubject>> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from("custom_subjects")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.warn("[subjectStore] getAllCustomSubjects failed:", error);
      return {};
    }

    return (data ?? []).reduce((acc: Record<string, CustomSubject>, row: any) => {
      acc[row.subject_id] = row;
      return acc;
    }, {});
  },
};

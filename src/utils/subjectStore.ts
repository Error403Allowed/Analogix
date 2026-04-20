"use client";

import { createClient } from "@/lib/supabase/client";
import type { SubjectColorId } from "@/components/ColorPicker";
import type { GeneratedStudyGuide } from "@/services/groq";
import {
  EMPTY_TIPTAP_DOC,
  TIPTAP_CONTENT_FORMAT,
  type DocumentRole,
} from "@/lib/document-content";
import { getAuthUser } from "./authCache";

// Alias so existing code in this file needs no changes
const getUser = getAuthUser;

// ── Subject data in-memory cache ─────────────────────────────────────────────
// Keyed by subjectId. Invalidated on every write so data is always fresh after
// a mutation, but repeat reads within a session are instant (no Supabase RTT).
const subjectCache = new Map<string, SubjectData>();
const subjectCachePromise = new Map<string, Promise<SubjectData>>();

function invalidateSubjectCache(subjectId: string) {
  subjectCache.delete(subjectId);
  subjectCachePromise.delete(subjectId);
}

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
  subjectId: string; // Store which subject this document belongs to
  title: string;
  icon?: string | null;
  cover?: string | null;
  content: string;
  contentJson?: string;
  contentText?: string;
  contentFormat?: string;
  role?: DocumentRole;
  studyGuideMarkdown?: string | null;
  studyGuideData?: GeneratedStudyGuide | null;
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
      subjectId: subjectId,
      title: typeof doc?.title === "string" ? doc.title : "",
      icon: typeof doc?.icon === "string" ? doc.icon : null,
      cover: typeof doc?.cover === "string" ? doc.cover : null,
      content: doc?.content || "",
      contentJson: typeof doc?.contentJson === "string" ? doc.contentJson : undefined,
      contentText: typeof doc?.contentText === "string" ? doc.contentText : undefined,
      contentFormat: typeof doc?.contentFormat === "string" ? doc.contentFormat : undefined,
      role: doc?.role === "study-guide" ? "study-guide" : "notes",
      studyGuideMarkdown: typeof doc?.studyGuideMarkdown === "string" ? doc.studyGuideMarkdown : undefined,
      studyGuideData: typeof doc?.studyGuideData === "object" && doc.studyGuideData
        ? (doc.studyGuideData as GeneratedStudyGuide)
        : undefined,
      createdAt: doc?.createdAt || notes.lastUpdated,
      lastUpdated: doc?.lastUpdated || notes.lastUpdated,
    }));
  }
  const legacyContent = notes.content || "";
  const legacyTitle = typeof notes.title === "string" ? notes.title : "";
  if (legacyContent || legacyTitle) {
    return [{
      id: `legacy-${subjectId}`,
      subjectId: subjectId,
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
    const user = await getUser();
    if (!user) return {};
    const supabase = createClient();
    const { data, error } = await supabase
      .from("subject_data")
      .select("subject_id, marks, notes")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) { console.warn("[subjectStore] getAll failed:", error); return {}; }
    return (data ?? []).reduce((acc: Record<string, SubjectData>, row: any) => {
      acc[row.subject_id] = {
        id: row.subject_id,
        marks: row.marks ?? [],
        notes: normalizeNotes(row.subject_id, row.notes),
      };
      return acc;
    }, {});
  },

  // Fetch a single subject row — cached in-memory for instant repeat reads.
  // Writes always invalidate the cache so data stays consistent.
  getSubject: async (subjectId: string): Promise<SubjectData> => {
    // 1. Serve from memory if already fetched this session
    if (subjectCache.has(subjectId)) return subjectCache.get(subjectId)!;
    // 2. Deduplicate concurrent fetches (only one network call in-flight)
    if (subjectCachePromise.has(subjectId)) return subjectCachePromise.get(subjectId)!;

    const fetch = (async () => {
      const user = await getUser();
      if (!user) return emptySubject(subjectId);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("subject_data")
        .select("subject_id, marks, notes")
        .eq("user_id", user.id)
        .eq("subject_id", subjectId)
        .maybeSingle();
      const result: SubjectData = (error || !data)
        ? emptySubject(subjectId)
        : { id: data.subject_id, marks: data.marks ?? [], notes: normalizeNotes(data.subject_id, data.notes) };
      subjectCache.set(subjectId, result);
      subjectCachePromise.delete(subjectId);
      return result;
    })();

    subjectCachePromise.set(subjectId, fetch);
    return fetch;
  },

  // Save directly without a read round-trip — caller provides full data
  saveSubject: async (subjectId: string, data: Partial<SubjectData>, currentData?: SubjectData): Promise<void> => {
    const user = await getUser();
    if (!user) return;
    const supabase = createClient();
    // Only fetch current data if caller didn't provide it
    const current = currentData ?? await subjectStore.getSubject(subjectId);
    const updated = { ...current, ...data };
    const { error } = await supabase.from("subject_data").upsert({
      user_id: user.id,
      subject_id: subjectId,
      marks: updated.marks,
      notes: updated.notes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,subject_id" });
    if (error) console.warn("[subjectStore] saveSubject failed:", error);
    // Invalidate cache so next read fetches fresh data from Supabase
    invalidateSubjectCache(subjectId);
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
    if (!subjectId) {
      console.error("[subjectStore] createDocument called with empty subjectId:", { subjectId, title });
      throw new Error("Cannot create document: subjectId is required");
    }
    const current = await subjectStore.getSubject(subjectId);
    const now = new Date().toISOString();
  const newDoc: SubjectDocumentItem = {
    id: crypto.randomUUID(),
    subjectId: subjectId,
    title: typeof title === "string" ? title.trim() : "",
    content: "<p></p>",
    contentJson: JSON.stringify(EMPTY_TIPTAP_DOC),
    contentText: "",
    contentFormat: TIPTAP_CONTENT_FORMAT,
    role: "notes",
    createdAt: now,
    lastUpdated: now,
  };
    console.log("[subjectStore] Creating document:", { subjectId: newDoc.subjectId, docId: newDoc.id, title: newDoc.title });
    await subjectStore.saveSubject(subjectId, {
      notes: { ...current.notes, documents: [newDoc, ...(current.notes.documents || [])], lastUpdated: now },
    }, current);
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
    }, current);
  },

  removeDocument: async (subjectId: string, docId: string): Promise<void> => {
    const current = await subjectStore.getSubject(subjectId);
    await subjectStore.saveSubject(subjectId, {
      notes: { ...current.notes, documents: (current.notes.documents || []).filter(d => d.id !== docId), lastUpdated: new Date().toISOString() },
    }, current);
  },

  duplicateDocument: async (subjectId: string, docId: string): Promise<SubjectDocumentItem> => {
    const current = await subjectStore.getSubject(subjectId);
    const docs = current.notes.documents || [];
    const target = docs.find(d => d.id === docId);
    if (!target) throw new Error("Document not found");
    const now = new Date().toISOString();
    const newDoc: SubjectDocumentItem = {
      ...target,
      id: crypto.randomUUID(),
      subjectId: subjectId,
      title: `${target.title} (Copy)`,
      createdAt: now,
      lastUpdated: now,
    };
    await subjectStore.saveSubject(subjectId, {
      notes: { ...current.notes, documents: [newDoc, ...docs], lastUpdated: now },
    }, current);
    return newDoc;
  },

  updateHomework: async (subjectId: string, homework: SubjectHomework[]): Promise<void> => {
    const current = await subjectStore.getSubject(subjectId);
    await subjectStore.saveSubject(subjectId, { notes: { ...current.notes, homework, lastUpdated: new Date().toISOString() } }, current);
  },

  updateLinks: async (subjectId: string, links: SubjectLink[]): Promise<void> => {
    const current = await subjectStore.getSubject(subjectId);
    await subjectStore.saveSubject(subjectId, { notes: { ...current.notes, links, lastUpdated: new Date().toISOString() } }, current);
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
    const user = await getUser();
    if (!user) return null;
    const supabase = createClient();

    const { data, error } = await supabase
      .from("custom_subjects")
      .select("*")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  },

  saveCustomSubject: async (subjectId: string, updates: Partial<CustomSubject>): Promise<void> => {
    const user = await getUser();
    if (!user) return;
    const supabase = createClient();

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
    const user = await getUser();
    if (!user) return {};
    const supabase = createClient();

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

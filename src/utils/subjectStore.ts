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

interface DocumentRow {
  id: string;
  owner_user_id: string;
  subject_id: string;
  title: string;
  content: string;
  content_json?: string | null;
  content_text?: string | null;
  content_format?: string | null;
  role?: string | null;
  icon?: string | null;
  cover?: string | null;
  study_guide_markdown?: string | null;
  study_guide_data?: GeneratedStudyGuide | null;
  created_at: string;
  updated_at: string;
  last_edited_by?: string | null;
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

const normalizeLegacyDocuments = (subjectId: string, notes: SubjectNotes | undefined): SubjectDocumentItem[] => {
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

const normalizeDocumentRow = (doc: Partial<DocumentRow>): SubjectDocumentItem => ({
  id: String(doc.id ?? crypto.randomUUID()),
  subjectId: String(doc.subject_id ?? ""),
  title: typeof doc.title === "string" ? doc.title : "",
  icon: typeof doc.icon === "string" ? doc.icon : null,
  cover: typeof doc.cover === "string" ? doc.cover : null,
  content: typeof doc.content === "string" ? doc.content : "",
  contentJson: typeof doc.content_json === "string" ? doc.content_json : undefined,
  contentText: typeof doc.content_text === "string" ? doc.content_text : undefined,
  contentFormat: typeof doc.content_format === "string" ? doc.content_format : undefined,
  role: doc.role === "study-guide" ? "study-guide" : "notes",
  studyGuideMarkdown:
    typeof doc.study_guide_markdown === "string" ? doc.study_guide_markdown : undefined,
  studyGuideData:
    typeof doc.study_guide_data === "object" && doc.study_guide_data
      ? (doc.study_guide_data as GeneratedStudyGuide)
      : undefined,
  createdAt: typeof doc.created_at === "string" ? doc.created_at : new Date().toISOString(),
  lastUpdated: typeof doc.updated_at === "string" ? doc.updated_at : new Date().toISOString(),
});

const normalizeNotes = (
  subjectId: string,
  notes: SubjectNotes | undefined,
  documents: SubjectDocumentItem[] = normalizeLegacyDocuments(subjectId, notes),
): SubjectNotes => ({
  content: notes?.content || "",
  lastUpdated: notes?.lastUpdated || new Date().toISOString(),
  homework: Array.isArray(notes?.homework) ? notes!.homework : [],
  links: Array.isArray(notes?.links) ? notes!.links : [],
  title: typeof notes?.title === "string" ? notes.title : "",
  documents,
  assessments: Array.isArray(notes?.assessments) ? notes!.assessments : [],
});

const serialiseNotesForStorage = (notes: SubjectNotes | undefined): SubjectNotes => ({
  content: notes?.content || "",
  lastUpdated: notes?.lastUpdated || new Date().toISOString(),
  homework: Array.isArray(notes?.homework) ? notes.homework : [],
  links: Array.isArray(notes?.links) ? notes.links : [],
  title: typeof notes?.title === "string" ? notes.title : "",
  documents: [],
  assessments: Array.isArray(notes?.assessments) ? notes.assessments : [],
});

async function fetchDocumentsForUser(
  userId: string,
  subjectId?: string,
): Promise<SubjectDocumentItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("documents")
    .select("*")
    .eq("owner_user_id", userId);

  if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) {
    console.warn("[subjectStore] fetchDocumentsForUser failed:", error);
    return [];
  }

  return (data ?? []).map((row) => normalizeDocumentRow(row as DocumentRow));
}

function groupDocumentsBySubject(documents: SubjectDocumentItem[]) {
  return documents.reduce<Record<string, SubjectDocumentItem[]>>((acc, document) => {
    const bucket = acc[document.subjectId] ?? [];
    bucket.push(document);
    acc[document.subjectId] = bucket;
    return acc;
  }, {});
}

export const subjectStore = {
  getAll: async (): Promise<Record<string, SubjectData>> => {
    const user = await getUser();
    if (!user) return {};
    const supabase = createClient();
    const [{ data, error }, documents] = await Promise.all([
      supabase
        .from("subject_data")
        .select("subject_id, marks, notes")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      fetchDocumentsForUser(user.id),
    ]);
    if (error) {
      console.warn("[subjectStore] getAll failed:", error);
      return {};
    }

    const documentsBySubject = groupDocumentsBySubject(documents);
    const subjects = (data ?? []).reduce((acc: Record<string, SubjectData>, row: any) => {
      acc[row.subject_id] = {
        id: row.subject_id,
        marks: row.marks ?? [],
        notes: normalizeNotes(row.subject_id, row.notes, documentsBySubject[row.subject_id] ?? []),
      };
      return acc;
    }, {});

    for (const [subjectId, docs] of Object.entries(documentsBySubject)) {
      if (!subjects[subjectId]) {
        subjects[subjectId] = {
          id: subjectId,
          marks: [],
          notes: normalizeNotes(subjectId, undefined, docs),
        };
      }
    }

    return subjects;
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
      const [{ data, error }, documents] = await Promise.all([
        supabase
          .from("subject_data")
          .select("subject_id, marks, notes")
          .eq("user_id", user.id)
          .eq("subject_id", subjectId)
          .maybeSingle(),
        fetchDocumentsForUser(user.id, subjectId),
      ]);
      const result: SubjectData = (error || !data)
        ? {
            ...emptySubject(subjectId),
            notes: normalizeNotes(subjectId, undefined, documents),
          }
        : {
            id: data.subject_id,
            marks: data.marks ?? [],
            notes: normalizeNotes(data.subject_id, data.notes, documents),
          };
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
    const now = new Date().toISOString();
    const { error } = await supabase.from("subject_data").upsert({
      user_id: user.id,
      subject_id: subjectId,
      marks: updated.marks,
      notes: serialiseNotesForStorage(updated.notes),
      updated_at: now,
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
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");
    const current = await subjectStore.getSubject(subjectId);
    await subjectStore.saveSubject(subjectId, current, current);
    const supabase = createClient();
    const now = new Date().toISOString();
    const nextDocId = crypto.randomUUID();
    const { data, error } = await supabase
      .from("documents")
      .insert({
        id: nextDocId,
        owner_user_id: user.id,
        subject_id: subjectId,
        title: typeof title === "string" ? title.trim() : "",
        content: "<p></p>",
        content_json: JSON.stringify(EMPTY_TIPTAP_DOC),
        content_text: "",
        content_format: TIPTAP_CONTENT_FORMAT,
        role: "notes",
        created_at: now,
        updated_at: now,
        last_edited_by: user.id,
      })
      .select("*")
      .single();
    if (error || !data) {
      console.warn("[subjectStore] createDocument failed:", error);
      throw new Error(error?.message || "Failed to create document");
    }
    invalidateSubjectCache(subjectId);
    window.dispatchEvent(new Event("subjectDataUpdated"));
    return normalizeDocumentRow(data as DocumentRow);
  },

  updateDocument: async (subjectId: string, docId: string, updates: Partial<SubjectDocumentItem>): Promise<void> => {
    const user = await getUser();
    if (!user) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      updated_at: now,
      last_edited_by: user.id,
    };

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.contentJson !== undefined) payload.content_json = updates.contentJson;
    if (updates.contentText !== undefined) payload.content_text = updates.contentText;
    if (updates.contentFormat !== undefined) payload.content_format = updates.contentFormat;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.icon !== undefined) payload.icon = updates.icon;
    if (updates.cover !== undefined) payload.cover = updates.cover;
    if (updates.studyGuideMarkdown !== undefined) payload.study_guide_markdown = updates.studyGuideMarkdown;
    if (updates.studyGuideData !== undefined) payload.study_guide_data = updates.studyGuideData;

    const { error } = await supabase
      .from("documents")
      .update(payload)
      .eq("id", docId)
      .eq("subject_id", subjectId);
    if (error) {
      console.warn("[subjectStore] updateDocument failed:", error);
      throw new Error(error.message);
    }
    invalidateSubjectCache(subjectId);
    window.dispatchEvent(new Event("subjectDataUpdated"));
  },

  removeDocument: async (subjectId: string, docId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", docId)
      .eq("subject_id", subjectId);
    if (error) {
      console.warn("[subjectStore] removeDocument failed:", error);
      throw new Error(error.message);
    }
    invalidateSubjectCache(subjectId);
    window.dispatchEvent(new Event("subjectDataUpdated"));
  },

  duplicateDocument: async (subjectId: string, docId: string): Promise<SubjectDocumentItem> => {
    const user = await getUser();
    if (!user) throw new Error("Not authenticated");
    const current = await subjectStore.getSubject(subjectId);
    const target = (current.notes.documents || []).find((d) => d.id === docId);
    if (!target) throw new Error("Document not found");
    const supabase = createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("documents")
      .insert({
        id: crypto.randomUUID(),
        owner_user_id: user.id,
        subject_id: subjectId,
        title: `${target.title} (Copy)`,
        content: target.content,
        content_json: target.contentJson ?? null,
        content_text: target.contentText ?? null,
        content_format: target.contentFormat ?? null,
        role: target.role ?? "notes",
        icon: target.icon ?? null,
        cover: target.cover ?? null,
        study_guide_markdown: target.studyGuideMarkdown ?? null,
        study_guide_data: target.studyGuideData ?? null,
        created_at: now,
        updated_at: now,
        last_edited_by: user.id,
      })
      .select("*")
      .single();
    if (error || !data) {
      console.warn("[subjectStore] duplicateDocument failed:", error);
      throw new Error(error?.message || "Failed to duplicate document");
    }
    invalidateSubjectCache(subjectId);
    window.dispatchEvent(new Event("subjectDataUpdated"));
    return normalizeDocumentRow(data as DocumentRow);
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

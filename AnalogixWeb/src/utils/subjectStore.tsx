"use client";
import { createClient } from "@/lib/supabase/client";
import { EMPTY_TIPTAP_DOC, TIPTAP_CONTENT_FORMAT, } from "@/lib/document-content";
import { getAuthUser } from "./authCache";
// Alias so existing code in this file needs no changes
const getUser = getAuthUser;
// ── Subject data in-memory cache ─────────────────────────────────────────────
// Keyed by subjectId. Invalidated on every write so data is always fresh after
// a mutation, but repeat reads within a session are instant (no Supabase RTT).
const subjectCache = new Map();
const subjectCachePromise = new Map();
function invalidateSubjectCache(subjectId) {
    subjectCache.delete(subjectId);
    subjectCachePromise.delete(subjectId);
}
const emptySubject = (subjectId) => ({
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
const normalizeLegacyDocuments = (subjectId, notes) => {
    if (!notes)
        return [];
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
            role: "notes",
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
const normalizeDocumentRow = (doc) => ({
    id: String(doc.id ?? crypto.randomUUID()),
    subjectId: String(doc.subject_id ?? ""),
    title: typeof doc.title === "string" ? doc.title : "",
    icon: typeof doc.icon === "string" ? doc.icon : null,
    cover: typeof doc.cover === "string" ? doc.cover : null,
    content: typeof doc.content === "string" ? doc.content : "",
    contentJson: typeof doc.content_json === "string" ? doc.content_json : undefined,
    contentText: typeof doc.content_text === "string" ? doc.content_text : undefined,
    contentFormat: typeof doc.content_format === "string" ? doc.content_format : undefined,
    role: "notes",
    createdAt: typeof doc.created_at === "string" ? doc.created_at : new Date().toISOString(),
    lastUpdated: typeof doc.updated_at === "string" ? doc.updated_at : new Date().toISOString(),
});
const normalizeNotes = (subjectId, notes, documents = normalizeLegacyDocuments(subjectId, notes)) => ({
    content: notes?.content || "",
    lastUpdated: notes?.lastUpdated || new Date().toISOString(),
    homework: Array.isArray(notes?.homework) ? notes.homework : [],
    links: Array.isArray(notes?.links) ? notes.links : [],
    title: typeof notes?.title === "string" ? notes.title : "",
    documents,
    assessments: Array.isArray(notes?.assessments) ? notes.assessments : [],
});
const serialiseNotesForStorage = (notes) => ({
    content: notes?.content || "",
    lastUpdated: notes?.lastUpdated || new Date().toISOString(),
    homework: Array.isArray(notes?.homework) ? notes.homework : [],
    links: Array.isArray(notes?.links) ? notes.links : [],
    title: typeof notes?.title === "string" ? notes.title : "",
    documents: [],
    assessments: Array.isArray(notes?.assessments) ? notes.assessments : [],
});
async function fetchDocumentsForUser(userId, subjectId) {
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
    return (data ?? []).map((row) => normalizeDocumentRow(row));
}
function groupDocumentsBySubject(documents) {
    return documents.reduce((acc, document) => {
        const bucket = acc[document.subjectId] ?? [];
        bucket.push(document);
        acc[document.subjectId] = bucket;
        return acc;
    }, {});
}
export const subjectStore = {
    getAll: async () => {
        const user = await getUser();
        if (!user)
            return {};
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
        const subjects = (data ?? []).reduce((acc, row) => {
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
    getSubject: async (subjectId) => {
        // 1. Serve from memory if already fetched this session
        if (subjectCache.has(subjectId))
            return subjectCache.get(subjectId);
        // 2. Deduplicate concurrent fetches (only one network call in-flight)
        if (subjectCachePromise.has(subjectId))
            return subjectCachePromise.get(subjectId);
        const fetch = (async () => {
            const user = await getUser();
            if (!user)
                return emptySubject(subjectId);
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
            const result = (error || !data)
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
    saveSubject: async (subjectId, data, currentData) => {
        const user = await getUser();
        if (!user)
            return;
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
        if (error)
            console.warn("[subjectStore] saveSubject failed:", error);
        // Invalidate cache so next read fetches fresh data from Supabase
        invalidateSubjectCache(subjectId);
        window.dispatchEvent(new Event("subjectDataUpdated"));
    },
    addMark: async (subjectId, mark) => {
        const current = await subjectStore.getSubject(subjectId);
        await subjectStore.saveSubject(subjectId, { marks: [...current.marks, { ...mark, id: crypto.randomUUID() }] });
    },
    updateNotes: async (subjectId, content, title) => {
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
    createDocument: async (subjectId, title) => {
        if (!subjectId) {
            console.error("[subjectStore] createDocument called with empty subjectId:", { subjectId, title });
            throw new Error("Cannot create document: subjectId is required");
        }
        const user = await getUser();
        if (!user)
            throw new Error("Not authenticated");
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
        return normalizeDocumentRow(data);
    },
    updateDocument: async (subjectId, docId, updates) => {
        const user = await getUser();
        if (!user)
            return;
        const supabase = createClient();
        const now = new Date().toISOString();
        const payload = {
            updated_at: now,
            last_edited_by: user.id,
        };
        if (updates.title !== undefined)
            payload.title = updates.title;
        if (updates.content !== undefined)
            payload.content = updates.content;
        if (updates.contentJson !== undefined)
            payload.content_json = updates.contentJson;
        if (updates.contentText !== undefined)
            payload.content_text = updates.contentText;
        if (updates.contentFormat !== undefined)
            payload.content_format = updates.contentFormat;
        if (updates.role !== undefined)
            payload.role = updates.role;
        if (updates.icon !== undefined)
            payload.icon = updates.icon;
        if (updates.cover !== undefined)
            payload.cover = updates.cover;
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
    removeDocument: async (subjectId, docId) => {
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
    duplicateDocument: async (subjectId, docId) => {
        const user = await getUser();
        if (!user)
            throw new Error("Not authenticated");
        const current = await subjectStore.getSubject(subjectId);
        const target = (current.notes.documents || []).find((d) => d.id === docId);
        if (!target)
            throw new Error("Document not found");
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
        return normalizeDocumentRow(data);
    },
    updateHomework: async (subjectId, homework) => {
        const current = await subjectStore.getSubject(subjectId);
        await subjectStore.saveSubject(subjectId, { notes: { ...current.notes, homework, lastUpdated: new Date().toISOString() } }, current);
    },
    updateLinks: async (subjectId, links) => {
        const current = await subjectStore.getSubject(subjectId);
        await subjectStore.saveSubject(subjectId, { notes: { ...current.notes, links, lastUpdated: new Date().toISOString() } }, current);
    },
    addAssessment: async (subjectId, assessment) => {
        const current = await subjectStore.getSubject(subjectId);
        const existing = current.notes.assessments || [];
        await subjectStore.saveSubject(subjectId, {
            notes: { ...current.notes, assessments: [assessment, ...existing], lastUpdated: new Date().toISOString() },
        });
    },
    removeAssessment: async (subjectId, assessmentId) => {
        const current = await subjectStore.getSubject(subjectId);
        const filtered = (current.notes.assessments || []).filter(a => a.id !== assessmentId);
        await subjectStore.saveSubject(subjectId, {
            notes: { ...current.notes, assessments: filtered, lastUpdated: new Date().toISOString() },
        });
    },
    // Custom subject appearance methods
    getCustomSubject: async (subjectId) => {
        const user = await getUser();
        if (!user)
            return null;
        const supabase = createClient();
        const { data, error } = await supabase
            .from("custom_subjects")
            .select("*")
            .eq("user_id", user.id)
            .eq("subject_id", subjectId)
            .maybeSingle();
        if (error || !data)
            return null;
        return data;
    },
    saveCustomSubject: async (subjectId, updates) => {
        const user = await getUser();
        if (!user)
            return;
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
            if (error)
                console.warn("[subjectStore] saveCustomSubject update failed:", error);
        }
        else {
            const { error } = await supabase
                .from("custom_subjects")
                .insert({
                user_id: user.id,
                subject_id: subjectId,
                ...updates,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            if (error)
                console.warn("[subjectStore] saveCustomSubject insert failed:", error);
        }
        window.dispatchEvent(new Event("customSubjectsUpdated"));
    },
    getAllCustomSubjects: async () => {
        const user = await getUser();
        if (!user)
            return {};
        const supabase = createClient();
        const { data, error } = await supabase
            .from("custom_subjects")
            .select("*")
            .eq("user_id", user.id);
        if (error) {
            console.warn("[subjectStore] getAllCustomSubjects failed:", error);
            return {};
        }
        return (data ?? []).reduce((acc, row) => {
            acc[row.subject_id] = row;
            return acc;
        }, {});
    },
};
//# sourceMappingURL=subjectStore.js.map
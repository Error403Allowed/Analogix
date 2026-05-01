/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ServerDocumentRecord {
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
  created_at: string;
  updated_at: string;
  last_edited_by?: string | null;
}

export function mapServerDocument(row: Record<string, unknown>): ServerDocumentRecord {
  return {
    id: String(row.id),
    owner_user_id: String(row.owner_user_id ?? ""),
    subject_id: String(row.subject_id ?? ""),
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    content_json: typeof row.content_json === "string" ? row.content_json : null,
    content_text: typeof row.content_text === "string" ? row.content_text : null,
    content_format: typeof row.content_format === "string" ? row.content_format : null,
    role: row.role === "study-guide" ? "study-guide" : "notes",
    icon: typeof row.icon === "string" ? row.icon : null,
    cover: typeof row.cover === "string" ? row.cover : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    last_edited_by: row.last_edited_by ? String(row.last_edited_by) : null,
  };
}

export async function listUserDocuments(
  supabase: { from: (table: string) => any },
  userId: string,
) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("owner_user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("[documents] listUserDocuments failed:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapServerDocument(row));
}

export async function listDocumentsByIds(
  supabase: { from: (table: string) => any },
  documentIds: string[],
) {
  if (documentIds.length === 0) return [];

  const { data, error } = await supabase.from("documents").select("*").in("id", documentIds);
  if (error) {
    console.warn("[documents] listDocumentsByIds failed:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapServerDocument(row));
}

export async function getDocumentById(
  supabase: { from: (table: string) => any },
  documentId: string,
) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.warn("[documents] getDocumentById failed:", error);
    }
    return null;
  }

  return mapServerDocument(data as Record<string, unknown>);
}

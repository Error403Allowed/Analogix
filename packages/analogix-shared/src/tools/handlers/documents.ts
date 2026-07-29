import { normalizeSubject, validateSubject } from "./validate-subject.js";
import { randomUUID } from "crypto";

function stripHtmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function listDocuments(userId: string, supabase: any, subjectId?: string) {
  let query = supabase
    .from("documents")
    .select("*")
    .eq("owner_user_id", userId)
    .order("updated_at", { ascending: false });
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createDocument(
  userId: string, supabase: any,
  args: { subjectId: string; title: string; content: string; contentFormat?: string; role?: string },
) {
  const normalizedSubjectId = normalizeSubject(args.subjectId);
  const subjectError = validateSubject(normalizedSubjectId);
  if (subjectError) throw new Error(subjectError);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      id: randomUUID(),
      owner_user_id: userId,
      subject_id: normalizedSubjectId,
      title: args.title,
      content: args.content,
      content_text: stripHtmlToText(args.content),
      content_format: args.contentFormat ?? "html",
      role: args.role ?? "notes",
      updated_at: now,
      created_at: now,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getDocument(userId: string, supabase: any, documentId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("owner_user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDocument(userId: string, supabase: any, documentId: string) {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("owner_user_id", userId);
  if (error) throw new Error(error.message);
  return { deleted: true };
}

export async function updateDocument(
  userId: string, supabase: any, documentId: string,
  fields: { title?: string; content?: string; contentFormat?: string },
) {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.title !== undefined) update.title = fields.title;
  if (fields.content !== undefined) {
    update.content = fields.content;
    update.content_text = stripHtmlToText(fields.content);
  }
  if (fields.contentFormat !== undefined) update.content_format = fields.contentFormat;
  const { data, error } = await supabase
    .from("documents")
    .update(update)
    .eq("id", documentId)
    .eq("owner_user_id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

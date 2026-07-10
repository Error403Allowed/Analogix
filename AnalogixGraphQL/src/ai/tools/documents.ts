import { z, randomUUID, normalizeSubject, validateSubject, type ToolHandler } from "./shared.js";

export const documentsHandlers: Record<string, ToolHandler> = {
  async list_documents(args, userId, supabase) {
    const subjectId = args.subjectId as string | undefined;
    let query = supabase
      .from("documents")
      .select("*")
      .eq("owner_user_id", userId)
      .order("updated_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create_document(args, userId, supabase) {
    const { subjectId, title, content, contentFormat, role } = z.object({
      subjectId: z.string(),
      title: z.string(),
      content: z.string(),
      contentFormat: z.string().optional(),
      role: z.string().optional(),
    }).parse(args);
    const normalizedSubjectId = normalizeSubject(subjectId);
    const subjectError = validateSubject(normalizedSubjectId);
    if (subjectError) throw new Error(subjectError);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("documents")
      .insert({
        id: randomUUID(),
        owner_user_id: userId,
        subject_id: normalizedSubjectId,
        title,
        content,
        content_text: content.replace(/<[^>]*>/g, ""),
        content_format: contentFormat ?? "html",
        role: role ?? "notes",
        updated_at: now,
        created_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async get_document(args, userId, supabase) {
    const documentId = z.string().parse(args.documentId);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("owner_user_id", userId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async delete_document(args, userId, supabase) {
    const documentId = z.string().parse(args.documentId);
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("owner_user_id", userId);
    if (error) throw new Error(error.message);
    return { deleted: true };
  },

  async update_document(args, userId, supabase) {
    const { documentId, title, content, contentFormat } = z.object({
      documentId: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      contentFormat: z.string().optional(),
    }).parse(args);
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (content !== undefined) {
      update.content = content;
      update.content_text = content.replace(/<[^>]*>/g, "");
    }
    if (contentFormat !== undefined) update.content_format = contentFormat;
    const { data, error } = await supabase
      .from("documents")
      .update(update)
      .eq("id", documentId)
      .eq("owner_user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};

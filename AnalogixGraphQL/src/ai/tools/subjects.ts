import { z, normalizeSubject, validateSubject, type ToolHandler } from "./shared.js";

export const subjectsHandlers: Record<string, ToolHandler> = {
  async list_subjects(_args, userId, supabase) {
    const { data, error } = await supabase
      .from("subject_data")
      .select("subject_id, marks, notes")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async get_subject(args, userId, supabase) {
    const subjectId = z.string().parse(args.subjectId);
    const { data, error } = await supabase
      .from("subject_data")
      .select("subject_id, marks, notes")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { subject_id: subjectId, marks: [], notes: {} };
  },

  async update_subject_notes(args, userId, supabase) {
    const { subjectId, content, title } = z.object({
      subjectId: z.string(),
      content: z.string(),
      title: z.string().optional(),
    }).parse(args);
    const normalizedSubjectId = normalizeSubject(subjectId);
    const { data: existing } = await supabase
      .from("subject_data")
      .select("notes")
      .eq("user_id", userId)
      .eq("subject_id", normalizedSubjectId)
      .maybeSingle();
    const existingNotes = (existing?.notes as Record<string, unknown>) ?? {};
    const { data, error } = await supabase
      .from("subject_data")
      .upsert({
        user_id: userId,
        subject_id: normalizedSubjectId,
        notes: {
          ...existingNotes,
          content,
          title: title ?? (existingNotes.title as string),
          lastUpdated: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,subject_id" })
      .select("subject_id, notes")
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};

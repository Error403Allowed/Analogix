import { normalizeSubject } from "./validate-subject.js";

export async function listSubjects(userId: string, supabase: any) {
  const { data, error } = await supabase
    .from("subject_data")
    .select("subject_id, marks, notes")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSubject(userId: string, supabase: any, subjectId: string) {
  const { data, error } = await supabase
    .from("subject_data")
    .select("subject_id, marks, notes")
    .eq("user_id", userId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { subject_id: subjectId, marks: [], notes: {} };
}

export async function updateSubjectNotes(
  userId: string,
  supabase: any,
  subjectId: string,
  content: string,
  title?: string,
) {
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
}

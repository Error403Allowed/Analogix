import { normalizeSubject, validateOptionalSubject } from "./validate-subject.js";
import { randomUUID } from "crypto";

export async function listEvents(userId: string, supabase: any, from?: string, to?: string) {
  let query = supabase
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createEvent(userId: string, supabase: any, args: {
  title: string; date: string; endDate?: string; type?: string;
  subject?: string; color?: string; description?: string;
}) {
  const subjectError = validateOptionalSubject(args.subject);
  if (subjectError) throw new Error(subjectError);
  const normalizedSubject = args.subject ? normalizeSubject(args.subject) : null;
  const { data, error } = await supabase
    .from("events")
    .insert({
      id: randomUUID(),
      user_id: userId,
      title: args.title,
      date: args.date,
      end_date: args.endDate ?? null,
      type: args.type ?? "other",
      subject: normalizedSubject,
      color: args.color ?? null,
      description: args.description ?? null,
      source: "manual",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateEvent(
  userId: string, supabase: any, eventId: string,
  fields: Record<string, unknown>,
) {
  const subject = fields.subject as string | undefined;
  const normalizedSubjectField = subject ? normalizeSubject(subject) : undefined;
  const subjectError = validateOptionalSubject(normalizedSubjectField);
  if (subjectError) throw new Error(subjectError);
  const update: Record<string, unknown> = {};
  if (fields.title !== undefined) update.title = fields.title;
  if (fields.date !== undefined) update.date = fields.date;
  if (fields.endDate !== undefined) update.end_date = fields.endDate;
  if (fields.type !== undefined) update.type = fields.type;
  if (normalizedSubjectField !== undefined) update.subject = normalizedSubjectField;
  if (fields.color !== undefined) update.color = fields.color;
  if (fields.description !== undefined) update.description = fields.description;
  const { data, error } = await supabase
    .from("events")
    .update(update)
    .eq("id", eventId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteEvent(userId: string, supabase: any, eventId: string) {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { deleted: true };
}

export async function listDeadlines(userId: string, supabase: any, from?: string, to?: string) {
  let query = supabase
    .from("deadlines")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });
  if (from) query = query.gte("due_date", from);
  if (to) query = query.lte("due_date", to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createDeadline(userId: string, supabase: any, args: {
  title: string; dueDate: string; subject?: string; priority?: string;
}) {
  const subjectError = validateOptionalSubject(args.subject);
  if (subjectError) throw new Error(subjectError);
  const normalizedSubject = args.subject ? normalizeSubject(args.subject) : null;
  const { data, error } = await supabase
    .from("deadlines")
    .insert({
      id: randomUUID(),
      user_id: userId,
      title: args.title,
      due_date: args.dueDate,
      subject: normalizedSubject,
      priority: args.priority ?? "medium",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

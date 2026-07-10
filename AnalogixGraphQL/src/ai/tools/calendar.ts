import { z, randomUUID, normalizeSubject, validateOptionalSubject, type ToolHandler } from "./shared.js";

export const calendarHandlers: Record<string, ToolHandler> = {
  async list_events(args, userId, supabase) {
    const { from, to } = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse(args);
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
  },

  async create_event(args, userId, supabase) {
    const { title, date, endDate, type, subject, color, description } = z.object({
      title: z.string(),
      date: z.string(),
      endDate: z.string().optional(),
      type: z.string().optional().default("other"),
      subject: z.string().optional(),
      color: z.string().optional(),
      description: z.string().optional(),
    }).parse(args);
    const subjectError = validateOptionalSubject(subject);
    if (subjectError) throw new Error(subjectError);
    const normalizedSubject = subject ? normalizeSubject(subject) : null;
    const { data, error } = await supabase
      .from("events")
      .insert({
        id: randomUUID(),
        user_id: userId,
        title,
        date,
        end_date: endDate ?? null,
        type,
        subject: normalizedSubject,
        color: color ?? null,
        description: description ?? null,
        source: "manual",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async update_event(args, userId, supabase) {
    const { eventId, ...fields } = z.object({
      eventId: z.string(),
      title: z.string().optional(),
      date: z.string().optional(),
      endDate: z.string().optional(),
      type: z.string().optional(),
      subject: z.string().optional(),
      color: z.string().optional(),
      description: z.string().optional(),
    }).parse(args);
    const normalizedSubjectField = fields.subject ? normalizeSubject(fields.subject) : undefined;
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
  },

  async delete_event(args, userId, supabase) {
    const eventId = z.string().parse(args.eventId);
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { deleted: true };
  },

  async list_deadlines(_args, userId, supabase) {
    const { data, error } = await supabase
      .from("deadlines")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create_deadline(args, userId, supabase) {
    const { title, dueDate, subject, priority } = z.object({
      title: z.string(),
      dueDate: z.string(),
      subject: z.string().optional(),
      priority: z.string().optional().default("medium"),
    }).parse(args);
    const subjectError = validateOptionalSubject(subject);
    if (subjectError) throw new Error(subjectError);
    const normalizedSubject = subject ? normalizeSubject(subject) : null;
    const { data, error } = await supabase
      .from("deadlines")
      .insert({
        id: randomUUID(),
        user_id: userId,
        title,
        due_date: dueDate,
        subject: normalizedSubject,
        priority,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};

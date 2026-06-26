import { z } from "zod";
import { createUserClient, requireUserId } from "../auth.js";
import { randomUUID } from "crypto";
import { validateOptionalSubject, normalizeSubject } from "../valid-subjects.js";

export const calendarTools = [
  {
    name: "list_events",
    description: "List calendar events within an optional date range",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date (ISO string, optional)" },
        to: { type: "string", description: "End date (ISO string, optional)" },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const { from, to } = z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      }).parse(args);
      const supabase = createUserClient(args);
      let query = supabase
        .from("events")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true });
      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
    },
  },
  {
    name: "create_event",
    description: "Create a new calendar event",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title" },
        date: { type: "string", description: "Event date (ISO string)" },
        endDate: { type: "string", description: "Optional end date (ISO string)" },
        type: { type: "string", description: "Event type: 'exam', 'assignment', 'event', 'class', 'lesson', 'reminder', 'sport', 'meeting', 'personal'" },
        subject: { type: "string", description: "Optional subject ID" },
        color: { type: "string", description: "Optional hex color" },
        description: { type: "string", description: "Optional description" },
      },
      required: ["title", "date"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
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
      const supabase = createUserClient(args);
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
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "update_event",
    description: "Update an existing calendar event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "Event ID" },
        title: { type: "string", description: "New title" },
        date: { type: "string", description: "New date (ISO string)" },
        endDate: { type: "string", description: "New end date" },
        type: { type: "string", description: "New type" },
        subject: { type: "string", description: "New subject ID" },
        color: { type: "string", description: "New hex color" },
        description: { type: "string", description: "New description" },
      },
      required: ["eventId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
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
      const supabase = createUserClient(args);
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
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "delete_event",
    description: "Delete a calendar event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "Event ID to delete" },
      },
      required: ["eventId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const eventId = z.string().parse(args.eventId);
      const supabase = createUserClient(args);
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify({ deleted: true }) }] };
    },
  },
  {
    name: "list_deadlines",
    description: "List all homework deadlines",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const supabase = createUserClient(args);
      const { data, error } = await supabase
        .from("deadlines")
        .select("*")
        .eq("user_id", userId)
        .order("due_date", { ascending: true });
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
    },
  },
  {
    name: "create_deadline",
    description: "Create a new homework deadline",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Deadline title" },
        dueDate: { type: "string", description: "Due date (ISO string)" },
        subject: { type: "string", description: "Optional subject ID" },
        priority: { type: "string", description: "Priority: 'low', 'medium', or 'high'" },
      },
      required: ["title", "dueDate"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const { title, dueDate, subject, priority } = z.object({
        title: z.string(),
        dueDate: z.string(),
        subject: z.string().optional(),
        priority: z.string().optional().default("medium"),
      }).parse(args);
      const subjectError = validateOptionalSubject(subject);
      if (subjectError) throw new Error(subjectError);
      const normalizedSubject = subject ? normalizeSubject(subject) : null;
      const supabase = createUserClient(args);
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
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
];

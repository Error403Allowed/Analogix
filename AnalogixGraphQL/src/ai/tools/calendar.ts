import { z, type ToolHandler } from "./shared.js";
import {
  listEvents, createEvent, updateEvent, deleteEvent,
  listDeadlines, createDeadline,
} from "@analogix/shared/tools/handlers";

export const calendarHandlers: Record<string, ToolHandler> = {
  async list_events(args, userId, supabase) {
    const { from, to } = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse(args);
    return await listEvents(userId, supabase, from, to);
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
    return await createEvent(userId, supabase, { title, date, endDate, type, subject, color, description });
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
    return await updateEvent(userId, supabase, eventId, fields as Record<string, unknown>);
  },

  async delete_event(args, userId, supabase) {
    const eventId = z.string().parse(args.eventId);
    return await deleteEvent(userId, supabase, eventId);
  },

  async list_deadlines(_args, userId, supabase) {
    return await listDeadlines(userId, supabase);
  },

  async create_deadline(args, userId, supabase) {
    const { title, dueDate, subject, priority } = z.object({
      title: z.string(),
      dueDate: z.string(),
      subject: z.string().optional(),
      priority: z.string().optional().default("medium"),
    }).parse(args);
    return await createDeadline(userId, supabase, { title, dueDate, subject, priority });
  },
};

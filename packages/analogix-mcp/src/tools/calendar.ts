import { z } from "zod";
import { createUserClient, requireUserId } from "../auth.js";
import {
  listEvents, createEvent, updateEvent, deleteEvent,
  listDeadlines, createDeadline,
} from "@analogix/shared/tools/handlers";

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
      const data = await listEvents(userId, supabase, from, to);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
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
        type: z.enum(["exam", "assignment", "event", "class", "lesson", "reminder", "sport", "meeting", "personal", "other"]).optional().default("other"),
        subject: z.string().optional(),
        color: z.string().optional(),
        description: z.string().optional(),
      }).parse(args);
      const supabase = createUserClient(args);
      const data = await createEvent(userId, supabase, { title, date, endDate, type, subject, color, description });
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
      const supabase = createUserClient(args);
      const data = await updateEvent(userId, supabase, eventId, fields as Record<string, unknown>);
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
      const data = await deleteEvent(userId, supabase, eventId);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
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
      const data = await listDeadlines(userId, supabase);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
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
      const supabase = createUserClient(args);
      const data = await createDeadline(userId, supabase, { title, dueDate, subject, priority });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
];

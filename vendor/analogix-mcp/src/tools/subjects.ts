import { z } from "zod";
import { createUserClient, requireUserId } from "../auth.js";
import { listSubjects, getSubject, updateSubjectNotes } from "@analogix/shared/tools/handlers";

export const subjectTools = [
  {
    name: "list_subjects",
    description: "List all subjects for the current user, including marks and notes",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const supabase = createUserClient(args);
      const data = await listSubjects(userId, supabase);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "get_subject",
    description: "Get a specific subject with marks, notes, homework, links, and assessments",
    inputSchema: {
      type: "object",
      properties: {
        subjectId: { type: "string", description: "Subject ID (e.g. 'math', 'biology')" },
      },
      required: ["subjectId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const subjectId = z.string().parse(args.subjectId);
      const supabase = createUserClient(args);
      const data = await getSubject(userId, supabase, subjectId);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "update_subject_notes",
    description: "Update the notes/content for a subject",
    inputSchema: {
      type: "object",
      properties: {
        subjectId: { type: "string", description: "Subject ID" },
        content: { type: "string", description: "New notes content" },
        title: { type: "string", description: "Optional title for the notes" },
      },
      required: ["subjectId", "content"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const { subjectId, content, title } = z.object({
        subjectId: z.string(),
        content: z.string(),
        title: z.string().optional(),
      }).parse(args);
      const supabase = createUserClient(args);
      const data = await updateSubjectNotes(userId, supabase, subjectId, content, title);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
];

import { z } from "zod";
import { createUserClient, requireUserId } from "../auth.js";
import { normalizeSubject } from "../valid-subjects.js";

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
      const { data, error } = await supabase
        .from("subject_data")
        .select("subject_id, marks, notes")
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
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
      const { data, error } = await supabase
        .from("subject_data")
        .select("subject_id, marks, notes")
        .eq("user_id", userId)
        .eq("subject_id", subjectId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? { subject_id: subjectId, marks: [], notes: {} }) }] };
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
      const normalizedSubjectId = normalizeSubject(subjectId);
      const supabase = createUserClient(args);
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
            title: title ?? existingNotes.title,
            lastUpdated: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,subject_id" })
        .select("subject_id, notes")
        .single();
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
];

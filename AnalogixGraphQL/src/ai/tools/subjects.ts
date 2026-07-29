import { z, type ToolHandler } from "./shared.js";
import { listSubjects, getSubject, updateSubjectNotes } from "@analogix/shared/tools/handlers";

export const subjectsHandlers: Record<string, ToolHandler> = {
  async list_subjects(_args, userId, supabase) {
    return await listSubjects(userId, supabase);
  },

  async get_subject(args, userId, supabase) {
    const subjectId = z.string().parse(args.subjectId);
    return await getSubject(userId, supabase, subjectId);
  },

  async update_subject_notes(args, userId, supabase) {
    const { subjectId, content, title } = z.object({
      subjectId: z.string(),
      content: z.string(),
      title: z.string().optional(),
    }).parse(args);
    return await updateSubjectNotes(userId, supabase, subjectId, content, title);
  },
};

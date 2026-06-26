import { z } from "zod";
import { createUserClient, requireUserId } from "../auth.js";
import { randomUUID } from "crypto";
import { validateSubject, normalizeSubject } from "../valid-subjects.js";

export const documentTools = [
  {
    name: "list_documents",
    description: "List documents, optionally filtered by subject",
    inputSchema: {
      type: "object",
      properties: {
        subjectId: { type: "string", description: "Optional subject ID to filter by" },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const subjectId = args.subjectId as string | undefined;
      const supabase = createUserClient(args);
      let query = supabase
        .from("documents")
        .select("*")
        .eq("owner_user_id", userId)
        .order("updated_at", { ascending: false });
      if (subjectId) query = query.eq("subject_id", subjectId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
    },
  },
  {
    name: "create_document",
    description: "Create a new document for a subject",
    inputSchema: {
      type: "object",
      properties: {
        subjectId: { type: "string", description: "Subject ID" },
        title: { type: "string", description: "Document title" },
        content: { type: "string", description: "Document content (HTML or markdown)" },
        contentFormat: { type: "string", description: "Content format: 'html', 'markdown', or 'json'" },
        role: { type: "string", description: "Document role: 'notes', 'study-guide', or 'shared'" },
      },
      required: ["subjectId", "title", "content"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const { subjectId, title, content, contentFormat, role } = z.object({
        subjectId: z.string(),
        title: z.string(),
        content: z.string(),
        contentFormat: z.string().optional(),
        role: z.string().optional(),
      }).parse(args);
      const normalizedSubjectId = normalizeSubject(subjectId);
      const subjectError = validateSubject(normalizedSubjectId);
      if (subjectError) throw new Error(subjectError);
      const now = new Date().toISOString();
      const supabase = createUserClient(args);
      const { data, error } = await supabase
        .from("documents")
        .insert({
          id: randomUUID(),
          owner_user_id: userId,
          subject_id: normalizedSubjectId,
          title,
          content,
          content_text: content.replace(/<[^>]*>/g, ""),
          content_format: contentFormat ?? "html",
          role: role ?? "notes",
          updated_at: now,
          created_at: now,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "get_document",
    description: "Get the full content of a document by ID",
    inputSchema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "Document ID" },
      },
      required: ["documentId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const documentId = z.string().parse(args.documentId);
      const supabase = createUserClient(args);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .eq("owner_user_id", userId)
        .single();
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "delete_document",
    description: "Delete a document by ID",
    inputSchema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "Document ID to delete" },
      },
      required: ["documentId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const documentId = z.string().parse(args.documentId);
      const supabase = createUserClient(args);
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId)
        .eq("owner_user_id", userId);
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify({ deleted: true }) }] };
    },
  },
  {
    name: "update_document",
    description: "Update an existing document's title, content, or format",
    inputSchema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "Document ID" },
        title: { type: "string", description: "New title" },
        content: { type: "string", description: "New content" },
        contentFormat: { type: "string", description: "Content format" },
      },
      required: ["documentId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const userId = requireUserId(args);
      const { documentId, title, content, contentFormat } = z.object({
        documentId: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
        contentFormat: z.string().optional(),
      }).parse(args);
      const supabase = createUserClient(args);
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (title !== undefined) update.title = title;
      if (content !== undefined) {
        update.content = content;
        update.content_text = content.replace(/<[^>]*>/g, "");
      }
      if (contentFormat !== undefined) update.content_format = contentFormat;
      const { data, error } = await supabase
        .from("documents")
        .update(update)
        .eq("id", documentId)
        .eq("owner_user_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
];

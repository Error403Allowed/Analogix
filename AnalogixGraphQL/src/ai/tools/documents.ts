import { z, type ToolHandler } from "./shared.js";
import {
  listDocuments, createDocument, getDocument, deleteDocument, updateDocument,
} from "@analogix/shared/tools/handlers";

export const documentsHandlers: Record<string, ToolHandler> = {
  async list_documents(args, userId, supabase) {
    const subjectId = args.subjectId as string | undefined;
    return await listDocuments(userId, supabase, subjectId);
  },

  async create_document(args, userId, supabase) {
    const { subjectId, title, content, contentFormat, role } = z.object({
      subjectId: z.string(),
      title: z.string(),
      content: z.string(),
      contentFormat: z.string().optional(),
      role: z.string().optional(),
    }).parse(args);
    return await createDocument(userId, supabase, { subjectId, title, content, contentFormat, role });
  },

  async get_document(args, userId, supabase) {
    const documentId = z.string().parse(args.documentId);
    return await getDocument(userId, supabase, documentId);
  },

  async delete_document(args, userId, supabase) {
    const documentId = z.string().parse(args.documentId);
    return await deleteDocument(userId, supabase, documentId);
  },

  async update_document(args, userId, supabase) {
    const { documentId, title, content, contentFormat } = z.object({
      documentId: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      contentFormat: z.string().optional(),
    }).parse(args);
    return await updateDocument(userId, supabase, documentId, { title, content, contentFormat });
  },
};

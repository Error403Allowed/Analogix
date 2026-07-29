import { z } from "zod";
import { createUserClient, requireUserId } from "../auth.js";
import {
  listDocuments, createDocument, getDocument, deleteDocument, updateDocument,
} from "@analogix/shared/tools/handlers";

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
      const data = await listDocuments(userId, supabase, subjectId);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
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
        contentFormat: z.enum(["html", "markdown", "json", "plain"]).optional(),
        role: z.enum(["notes", "study-guide", "shared"]).optional(),
      }).parse(args);
      const supabase = createUserClient(args);
      const data = await createDocument(userId, supabase, { subjectId, title, content, contentFormat, role });
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
      const data = await getDocument(userId, supabase, documentId);
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
      const data = await deleteDocument(userId, supabase, documentId);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
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
        contentFormat: z.enum(["html", "markdown", "json", "plain"]).optional(),
      }).parse(args);
      const supabase = createUserClient(args);
      const data = await updateDocument(userId, supabase, documentId, { title, content, contentFormat });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
];

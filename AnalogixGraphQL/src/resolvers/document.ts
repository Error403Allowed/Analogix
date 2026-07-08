import { GraphQLError } from "graphql";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";

export const documentResolvers = {
  Query: {
    documents: async (_: unknown, args: { subjectId?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      let query = ctx.supabase!
        .from("documents")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (args.subjectId) query = query.eq("subject_id", args.subjectId);
      const { data, error } = await query;
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map(mapDocument);
    },
    document: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("documents")
        .select("*")
        .eq("id", args.id)
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (error) throw new GraphQLError(error.message);
      return data ? mapDocument(data) : null;
    },
    documentVersions: async (_: unknown, args: { documentId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data: doc } = await ctx.supabase!
        .from("documents")
        .select("id")
        .eq("id", args.documentId)
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (!doc) throw new GraphQLError("Document not found");
      const { data, error } = await ctx.supabase!
        .from("document_versions")
        .select("*")
        .eq("document_id", args.documentId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((v) => ({
        id: v.id,
        documentId: v.document_id,
        content: v.content,
        contentJson: v.content_json,
        contentText: v.content_text,
        createdAt: v.created_at,
        createdBy: v.created_by,
      }));
    },
  },

  Mutation: {
    createDocument: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const { data, error } = await ctx.supabase!
        .from("documents")
        .insert({
          id,
          owner_user_id: user.id,
          subject_id: args.input.subjectId,
          title: args.input.title ?? "Untitled",
          content: args.input.content ?? "<p></p>",
          content_json: typeof args.input.contentJson === "string" ? args.input.contentJson : null,
          content_text: "",
          content_format: "tiptap",
          role: args.input.role ?? "notes",
          icon: args.input.icon ?? null,
          cover: args.input.cover ?? null,
          created_at: now,
          updated_at: now,
          last_edited_by: user.id,
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return mapDocument(data);
    },
    updateDocument: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { documentId, subjectId, ...updates } = args.input;
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        last_edited_by: user.id,
      };
      if (typeof updates.title === "string") payload.title = updates.title;
      if (typeof updates.content === "string") payload.content = updates.content;
      if (typeof updates.contentJson === "string") payload.content_json = updates.contentJson;
      if (typeof updates.contentText === "string") payload.content_text = updates.contentText;
      if (typeof updates.contentFormat === "string") payload.content_format = updates.contentFormat;
      if (typeof updates.role === "string") payload.role = updates.role;
      if ("icon" in updates) payload.icon = updates.icon;
      if ("cover" in updates) payload.cover = updates.cover;
      const { data, error } = await ctx.supabase!
        .from("documents")
        .update(payload)
        .eq("id", documentId)
        .eq("owner_user_id", user.id)
        .eq("subject_id", subjectId)
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return mapDocument(data);
    },
    duplicateDocument: async (_: unknown, args: { documentId: string; subjectId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data: orig, error: readError } = await ctx.supabase!
        .from("documents")
        .select("*")
        .eq("id", args.documentId)
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (readError) throw new GraphQLError(readError.message);
      if (!orig) throw new GraphQLError("Document not found");
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase!
        .from("documents")
        .insert({
          ...orig,
          id: crypto.randomUUID(),
          title: `${orig.title} (Copy)`,
          created_at: now,
          updated_at: now,
          last_edited_by: user.id,
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return mapDocument(data);
    },
    deleteDocument: async (_: unknown, args: { documentId: string; subjectId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { error } = await ctx.supabase!
        .from("documents")
        .delete()
        .eq("id", args.documentId)
        .eq("owner_user_id", user.id)
        .eq("subject_id", args.subjectId);
      if (error) throw new GraphQLError(error.message);
      return { success: true };
    },
    revertDocument: async (_: unknown, args: { documentId: string; versionId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data: version, error: readError } = await ctx.supabase!
        .from("document_versions")
        .select("*")
        .eq("id", args.versionId)
        .eq("document_id", args.documentId)
        .maybeSingle();
      if (readError) throw new GraphQLError(readError.message);
      if (!version) throw new GraphQLError("Version not found");
      const { data, error } = await ctx.supabase!
        .from("documents")
        .update({
          content: version.content,
          content_json: version.content_json,
          content_text: version.content_text,
          updated_at: new Date().toISOString(),
          last_edited_by: user.id,
        })
        .eq("id", args.documentId)
        .eq("owner_user_id", user.id)
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return mapDocument(data);
    },
  },

  Document: {
    subjectId: (d: { subjectId: string }) => d.subjectId,
    contentJson: (d: { contentJson?: string | null }) => d.contentJson ?? null,
    contentText: (d: { contentText?: string | null }) => d.contentText ?? null,
    contentFormat: (d: { contentFormat?: string | null }) => d.contentFormat ?? null,
    role: (d: { role?: string }) => d.role ?? "notes",
    icon: (d: { icon?: string | null }) => d.icon ?? null,
    cover: (d: { cover?: string | null }) => d.cover ?? null,
    createdAt: (d: { createdAt: string }) => d.createdAt,
    lastUpdated: (d: { lastUpdated: string }) => d.lastUpdated,
    lastEditedBy: (d: { lastEditedBy?: string | null }) => d.lastEditedBy ?? null,
  },
};

function mapDocument(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    subjectId: String(row.subject_id),
    title: String(row.title ?? "Untitled"),
    content: String(row.content ?? ""),
    contentJson: (row.content_json as string | null) ?? null,
    contentText: (row.content_text as string | null) ?? null,
    contentFormat: (row.content_format as string | null) ?? null,
    role: (row.role as string) ?? "notes",
    icon: (row.icon as string | null) ?? null,
    cover: (row.cover as string | null) ?? null,
    createdAt: String(row.created_at),
    lastUpdated: String(row.updated_at),
    lastEditedBy: (row.last_edited_by as string | null) ?? null,
  };
}

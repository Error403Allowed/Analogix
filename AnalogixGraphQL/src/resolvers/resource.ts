import { GraphQLError } from "graphql";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";

export const resourceResolvers = {
  Query: {
    resources: async (_: unknown, args: { subjectId?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      let query = ctx.supabase!.from("resources").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (args.subjectId) query = query.eq("subject_id", args.subjectId);
      const { data, error } = await query;
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        mimeType: r.mime_type,
        sizeBytes: Number(r.size_bytes ?? 0),
        url: r.url,
        thumbnailUrl: r.thumbnail_url,
        subjectId: r.subject_id,
        createdAt: r.created_at,
      }));
    },
  },
  Mutation: {
    uploadResource: async (
      _: unknown,
      args: { name: string; mimeType: string; base64: string; subjectId?: string },
      ctx: GraphQLContext
    ) => {
      const user = requireUser(ctx);
      const buffer = Buffer.from(args.base64, "base64");
      const fileName = `${user.id}/${crypto.randomUUID()}-${args.name}`;
      const { error: uploadError } = await ctx.serviceClient.storage
        .from("resources")
        .upload(fileName, buffer, { contentType: args.mimeType, upsert: false });
      if (uploadError) throw new GraphQLError(uploadError.message);
      const { data: pub } = ctx.serviceClient.storage.from("resources").getPublicUrl(fileName);
      const { data, error } = await ctx.supabase!
        .from("resources")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          name: args.name,
          type: guessResourceType(args.mimeType),
          mime_type: args.mimeType,
          size_bytes: buffer.length,
          url: pub.publicUrl,
          subject_id: args.subjectId ?? null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        mimeType: data.mime_type,
        sizeBytes: Number(data.size_bytes ?? 0),
        url: data.url,
        thumbnailUrl: data.thumbnail_url,
        subjectId: data.subject_id,
        createdAt: data.created_at,
      };
    },
    deleteResource: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { error } = await ctx.supabase!.from("resources").delete().eq("id", args.id).eq("user_id", user.id);
      if (error) throw new GraphQLError(error.message);
      return { success: true };
    },
  },
};

function guessResourceType(mime: string): string {
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("word") || mime.includes("officedocument")) return "docx";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "pptx";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("text/") || mime.includes("markdown")) return "text";
  return "other";
}

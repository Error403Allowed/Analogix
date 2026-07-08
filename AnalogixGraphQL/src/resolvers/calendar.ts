import { GraphQLError } from "graphql";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";

export const calendarResolvers = {
  Query: {
    events: async (_: unknown, args: { from?: string; to?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      let query = ctx.supabase!.from("events").select("*").eq("user_id", user.id).order("date", { ascending: true }).limit(200);
      if (args.from) query = query.gte("date", args.from);
      if (args.to) query = query.lt("date", args.to);
      const { data, error } = await query;
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map(mapEvent);
    },
    deadlines: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("deadlines")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true })
        .limit(100);
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map(mapDeadline);
    },
  },

  Mutation: {
    createEvent: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const allowed = pickAllowed(args.input, ["title", "date", "end_date", "type", "subject", "color", "description", "location"]);
      const { data, error } = await ctx.supabase!
        .from("events")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          ...allowed,
          source: "manual",
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return mapEvent(data);
    },
    updateEvent: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const allowed = pickAllowed(args.input, ["title", "date", "end_date", "type", "subject", "color", "description", "location"]);
      const { data, error } = await ctx.supabase!
        .from("events")
        .update(allowed)
        .eq("id", args.id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return mapEvent(data);
    },
    deleteEvent: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { error } = await ctx.supabase!.from("events").delete().eq("id", args.id).eq("user_id", user.id);
      if (error) throw new GraphQLError(error.message);
      return { success: true };
    },
    importIcs: async (_: unknown, args: { ics: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      // Delegate to the ICS parser
      const { parseIcs } = await import("../ai/ics.js");
      const events = parseIcs(args.ics);
      if (events.length === 0) return 0;
      const inserts = events.map((e) => ({
        id: crypto.randomUUID(),
        user_id: user.id,
        title: e.title,
        date: e.date,
        end_date: e.endDate,
        type: e.type ?? "import",
        location: e.location,
        description: e.description,
        source: "import",
      }));
      const { error } = await ctx.supabase!.from("events").insert(inserts);
      if (error) throw new GraphQLError(error.message);
      return inserts.length;
    },
    addDeadline: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const allowed = pickAllowed(args.input, ["title", "due_date", "subject", "priority", "description"]);
      const { data, error } = await ctx.supabase!
        .from("deadlines")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          ...allowed,
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return mapDeadline(data);
    },
    updateDeadline: async (_: unknown, args: { id: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const allowed = pickAllowed(args.input, ["title", "due_date", "subject", "priority", "description"]);
      const { data, error } = await ctx.supabase!
        .from("deadlines")
        .update(allowed)
        .eq("id", args.id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return mapDeadline(data);
    },
    deleteDeadline: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { error } = await ctx.supabase!.from("deadlines").delete().eq("id", args.id).eq("user_id", user.id);
      if (error) throw new GraphQLError(error.message);
      return { success: true };
    },
  },
};

function mapEvent(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    date: String(row.date),
    endDate: (row.end_date as string | null) ?? null,
    type: String(row.type ?? "general"),
    subject: (row.subject as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    source: String(row.source ?? "manual"),
  };
}

function mapDeadline(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    dueDate: String(row.due_date),
    subject: (row.subject as string | null) ?? null,
    priority: String(row.priority ?? "medium"),
    createdAt: String(row.created_at),
  };
}

function pickAllowed(input: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in input) {
      result[key] = input[key];
    }
  }
  return result;
}

import { GraphQLError } from "graphql";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";
import { getCurriculum } from "@analogix/shared/curriculum";

const ICONS: Record<string, string> = {
  math: "math-integral",
  biology: "leaf",
  science: "atom",
  english: "book-open-variant",
  history: "castle",
  geography: "earth",
  computing: "code-tags",
  physics: "lightning-bolt",
  chemistry: "flask",
  languages: "translate",
};

function subjectName(id: string): string {
  return id
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function subjectIcon(id: string): string {
  return ICONS[id] ?? "book";
}

function subjectColor(id: string): string {
  const palette: Record<string, string> = {
    math: "#7C5CFF",
    science: "#0EA5E9",
    english: "#F472B6",
    history: "#F59E0B",
    geography: "#10B981",
    physics: "#A78BFA",
    chemistry: "#EC4899",
    biology: "#22C55E",
    computing: "#3B82F6",
    languages: "#8B5CF6",
  };
  return palette[id] ?? "#7C5CFF";
}

function chaptersFor(id: string) {
  const curriculum = getCurriculum();
  const entry = curriculum.find((c: { id: string }) => c.id === id);
  if (!entry) return [];
  // Map strands -> chapters (v1 simplification), and topics -> topics.
  return entry.grades.flatMap((g: { strands: { id: string; name: string; topics: { id: string; name: string }[] }[] }) =>
    g.strands.map((s, idx) => ({
      id: s.id,
      name: s.name,
      order: idx,
      topics: s.topics.map((t, tIdx) => ({ id: t.id, name: t.name, order: tIdx })),
    }))
  );
}

export const subjectResolvers = {
  Query: {
    subjects: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const [{ data: subjectData }, { data: documents }] = await Promise.all([
        ctx.supabase!.from("subject_data").select("subject_id, marks, notes").eq("user_id", user.id),
        ctx.supabase!.from("documents").select("*").eq("owner_user_id", user.id),
      ]);
      if (!subjectData) return [];
      const docsBySubject = new Map<string, unknown[]>();
      (documents ?? []).forEach((doc) => {
        const list = docsBySubject.get(doc.subject_id) ?? [];
        list.push(doc);
        docsBySubject.set(doc.subject_id, list);
      });
      return subjectData.map((row) => ({
        id: row.subject_id,
        marks: row.marks ?? [],
        notes: normalizeNotes(row.notes, row.subject_id),
      }));
    },
    subject: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("subject_data")
        .select("subject_id, marks, notes")
        .eq("user_id", user.id)
        .eq("subject_id", args.id)
        .maybeSingle();
      if (error) throw new GraphQLError(error.message);
      const { data: documents } = await ctx.supabase!
        .from("documents")
        .select("*")
        .eq("owner_user_id", user.id)
        .eq("subject_id", args.id);
      return data
        ? {
            id: data.subject_id,
            marks: data.marks ?? [],
            notes: normalizeNotes(data.notes, data.subject_id),
          }
        : {
            id: args.id,
            marks: [],
            notes: { content: "", lastUpdated: new Date().toISOString(), title: null, homework: [], links: [], assessments: [] },
          };
    },
    customSubjects: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("custom_subjects")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map((row) => ({
        id: row.id,
        subjectId: row.subject_id,
        customIcon: row.custom_icon,
        customColor: row.custom_color,
        customCover: row.custom_cover,
        customTitle: row.custom_title,
      }));
    },
    studyMap: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const curriculum = getCurriculum();
      // For each curriculum subject, compute progress from flashcards + quizzes.
      const { data: cards } = await ctx.supabase!
        .from("flashcards")
        .select("subject_id, repetitions, ease_factor, last_reviewed")
        .eq("user_id", user.id);
      const { data: quizzes } = await ctx.supabase!
        .from("quizzes")
        .select("subject_id, score, total")
        .eq("user_id", user.id);
      return curriculum.map((entry: { id: string; grades: { strands: { topics: unknown[] }[] }[] }) => {
        const totalTopics = entry.grades.reduce(
          (acc, g) => acc + g.strands.reduce((s, st) => s + st.topics.length, 0),
          0
        );
        const subjectCards = (cards ?? []).filter((c) => c.subject_id === entry.id);
        const masteredTopics = Math.min(totalTopics, Math.floor(subjectCards.reduce((a, c) => a + (c.ease_factor ?? 2.5) - 2, 0)));
        const subjectQuizzes = (quizzes ?? []).filter((q) => q.subject_id === entry.id);
        const quizProgress = subjectQuizzes.length
          ? Math.round(
              (subjectQuizzes.reduce((a, q) => a + (q.score / Math.max(1, q.total)), 0) / subjectQuizzes.length) * 100
            )
          : 0;
        const progressPercent = Math.max(
          masteredTopics > 0 ? Math.round((masteredTopics / Math.max(1, totalTopics)) * 100) : 0,
          quizProgress
        );
        return {
          subjectId: entry.id,
          progressPercent,
          masteredTopics: Math.max(0, masteredTopics),
          totalTopics,
        };
      });
    },
  },

  Mutation: {
    saveCustomSubject: async (_: unknown, args: { subjectId: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("custom_subjects")
        .upsert(
          { user_id: user.id, subject_id: args.subjectId, ...args.input, updated_at: new Date().toISOString() },
          { onConflict: "user_id,subject_id" }
        )
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return {
        id: data.id,
        subjectId: data.subject_id,
        customIcon: data.custom_icon,
        customColor: data.custom_color,
        customCover: data.custom_cover,
        customTitle: data.custom_title,
      };
    },
    addMark: async (_: unknown, args: { subjectId: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const mark = { id: crypto.randomUUID(), ...args.input };
      const { data, error } = await ctx.supabase!.rpc("append_subject_mark", {
        p_user_id: user.id,
        p_subject_id: args.subjectId,
        p_mark: mark,
      });
      if (error) throw new GraphQLError(error.message);
      return data;
    },
    updateNotes: async (_: unknown, args: { subjectId: string; content: string; title?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data: existing, error: fetchError } = await ctx.supabase!
        .from("subject_data")
        .select("notes")
        .eq("user_id", user.id)
        .eq("subject_id", args.subjectId)
        .maybeSingle();
      const existingNotes = existing?.notes ?? {};
      const { data, error } = await ctx.supabase!
        .from("subject_data")
        .upsert(
          {
            user_id: user.id,
            subject_id: args.subjectId,
            notes: {
              ...existingNotes,
              content: args.content,
              title: args.title ?? existingNotes.title,
              lastUpdated: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,subject_id" }
        )
        .select("subject_id, marks, notes")
        .single();
      if (error) throw new GraphQLError(error.message);
      return {
        id: data.subject_id,
        marks: data.marks ?? [],
        notes: normalizeNotes(data.notes, data.subject_id),
      };
    },
    addAssessment: async (_: unknown, args: { subjectId: string; input: Record<string, unknown> }, ctx: GraphQLContext) => {
      // Hand-off to subject context; for v1, write to subject_data.notes.assessments via RPC.
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!.rpc("add_subject_assessment", {
        p_user_id: user.id,
        p_subject_id: args.subjectId,
        p_assessment: args.input,
      });
      if (error) throw new GraphQLError(error.message);
      return data;
    },
    removeAssessment: async (_: unknown, args: { subjectId: string; assessmentId: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!.rpc("remove_subject_assessment", {
        p_user_id: user.id,
        p_subject_id: args.subjectId,
        p_assessment_id: args.assessmentId,
      });
      if (error) throw new GraphQLError(error.message);
      return { id: data?.subject_id ?? args.subjectId, marks: data?.marks ?? [], notes: normalizeNotes(data?.notes, args.subjectId) };
    },
    saveSubjectNotes: async (_: unknown, args: { subjectId: string; notes: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data: existing, error: fetchError } = await ctx.supabase!
        .from("subject_data")
        .select("notes")
        .eq("user_id", user.id)
        .eq("subject_id", args.subjectId)
        .maybeSingle();
      const existingNotes = existing?.notes ?? {};
      const merged = { ...existingNotes, ...args.notes, lastUpdated: new Date().toISOString() };
      const { data, error } = await ctx.supabase!
        .from("subject_data")
        .upsert(
          { user_id: user.id, subject_id: args.subjectId, notes: merged, updated_at: new Date().toISOString() },
          { onConflict: "user_id,subject_id" }
        )
        .select("subject_id, marks, notes")
        .single();
      if (error) throw new GraphQLError(error.message);
      return { id: data.subject_id, marks: data.marks ?? [], notes: normalizeNotes(data.notes, data.subject_id) };
    },
  },

  Subject: {
    id: (s: { id: string }) => s.id,
    name: (s: { id: string }) => subjectName(s.id),
    icon: (s: { id: string }) => subjectIcon(s.id),
    color: (s: { id: string }) => subjectColor(s.id),
    chapters: (s: { id: string }) => chaptersFor(s.id),
  },
  SubjectChapter: {
    id: (c: { id: string }) => c.id,
    name: (c: { name: string }) => c.name,
    order: (c: { order: number }) => c.order ?? 0,
    topics: (c: { topics: unknown[] }) => c.topics ?? [],
  },
  SubjectTopic: {
    id: (t: { id: string }) => t.id,
    name: (t: { name: string }) => t.name,
    order: (t: { order: number }) => t.order ?? 0,
  },
  SubjectMapEntry: {
    subjectId: (e: { subjectId: string }) => e.subjectId,
    progressPercent: (e: { progressPercent: number }) => e.progressPercent ?? 0,
    masteredTopics: (e: { masteredTopics: number }) => e.masteredTopics ?? 0,
    totalTopics: (e: { totalTopics: number }) => e.totalTopics ?? 0,
  },
  SubjectNotes: {
    content: (n: { content?: string }) => n.content ?? "",
    lastUpdated: (n: { lastUpdated?: string }) => n.lastUpdated ?? new Date().toISOString(),
    title: (n: { title?: string | null }) => n.title ?? null,
    homework: (n: { homework?: unknown[] }) => n.homework ?? [],
    links: (n: { links?: unknown[] }) => n.links ?? [],
    assessments: (n: { assessments?: unknown[] }) => n.assessments ?? [],
  },
  SubjectMark: {
    id: (m: { id: string }) => m.id,
    title: (m: { title: string }) => m.title,
    score: (m: { score: number }) => m.score,
    total: (m: { total: number }) => m.total,
    date: (m: { date: string }) => m.date,
  },
  CustomSubject: {
    id: (c: { id: string }) => c.id,
    subjectId: (c: { subjectId: string }) => c.subjectId,
    customIcon: (c: { customIcon: string | null }) => c.customIcon,
    customColor: (c: { customColor: string | null }) => c.customColor,
    customCover: (c: { customCover: string | null }) => c.customCover,
    customTitle: (c: { customTitle: string | null }) => c.customTitle,
  },
};

function normalizeNotes(rawNotes: unknown, subjectId: string) {
  const notes = (rawNotes as Record<string, unknown> | null) ?? {};
  return {
    content: typeof notes.content === "string" ? notes.content : "",
    lastUpdated: typeof notes.lastUpdated === "string" ? notes.lastUpdated : new Date().toISOString(),
    title: typeof notes.title === "string" ? notes.title : null,
    homework: Array.isArray(notes.homework) ? notes.homework : [],
    links: Array.isArray(notes.links) ? notes.links : [],
    assessments: Array.isArray(notes.assessments) ? notes.assessments : [],
  };
}

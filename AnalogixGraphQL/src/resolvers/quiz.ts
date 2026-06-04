import { GraphQLError } from "graphql";
import { z } from "zod";
import { requireUser } from "./_helpers.js";
import type { GraphQLContext } from "../context.js";
import { GenerateQuizInput, GradeShortAnswerInput, QuizReviewInput } from "@analogix/shared/schemas";
import { callGroqChat } from "../ai/groq.js";
import { logger } from "../logger.js";

export const quizResolvers = {
  Query: {
    quizzes: async (_: unknown, args: { subjectId?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      let query = ctx.supabase!.from("quizzes").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (args.subjectId) query = query.eq("subject_id", args.subjectId);
      const { data, error } = await query;
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map(mapQuiz);
    },
    quiz: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const { data, error } = await ctx.supabase!
        .from("quizzes")
        .select("*")
        .eq("id", args.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw new GraphQLError(error.message);
      return data ? mapQuiz(data) : null;
    },
    attempts: async (_: unknown, args: { quizId?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      let query = ctx.supabase!.from("quiz_attempts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (args.quizId) query = query.eq("quiz_id", args.quizId);
      const { data, error } = await query;
      if (error) throw new GraphQLError(error.message);
      return (data ?? []).map(mapAttempt);
    },
  },

  Mutation: {
    generateQuiz: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const parsed = GenerateQuizInput.parse(args.input);
      const prompt = buildQuizPrompt(parsed);
      const response = await callGroqChat({
        messages: [
          {
            role: "system",
            content:
              'You generate adaptive quizzes. Return ONLY valid JSON in the format { questions: [...] } — no other prose.',
          },
          { role: "user", content: prompt },
        ],
        maxTokens: 2000,
        temperature: 0.4,
      });
      const parsedQuiz = safeParseQuiz(response);
      if (!parsedQuiz) throw new GraphQLError("Failed to generate quiz — invalid response from AI");
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase!
        .from("quizzes")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          subject_id: parsed.subjectId ?? "general",
          title: parsed.topic,
          difficulty: parsed.difficulty,
          questions: parsedQuiz.questions,
          created_at: now,
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return mapQuiz(data);
    },
    gradeShortAnswer: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const parsed = GradeShortAnswerInput.parse(args.input);
      const prompt = `Question: ${parsed.question}\nExpected answer: ${parsed.correctAnswer}\nStudent answer: ${parsed.userAnswer}\n\n` +
        `Score 0-100 and give brief feedback. Return JSON: { score, feedback, isCorrect }`;
      const response = await callGroqChat({
        messages: [
          { role: "system", content: "You grade short-answer questions. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        maxTokens: 400,
        temperature: 0.2,
      });
      const json = safeParseJson(response);
      return {
        score: json?.score ?? 0,
        feedback: json?.feedback ?? "Could not grade answer.",
        isCorrect: Boolean(json?.isCorrect),
      };
    },
    quizReview: async (_: unknown, args: { input: Record<string, unknown> }, ctx: GraphQLContext) => {
      const user = requireUser(ctx);
      const parsed = QuizReviewInput.parse(args.input);
      const prompt = `You are an encouraging study tutor. Review the student's quiz answers below and give feedback. ` +
        `For each question, briefly state what they got right or wrong and a tip. End with a 1-2 sentence overall summary. ` +
        `Return JSON: { summary, questions: [{ id, feedback }] }.\n\n${JSON.stringify(parsed.answers, null, 2)}`;
      const response = await callGroqChat({
        messages: [
          { role: "system", content: "You write helpful quiz feedback. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        maxTokens: 1500,
        temperature: 0.5,
      });
      const json = safeParseJson(response);
      return {
        summary: json?.summary ?? "Good effort!",
        questions: Array.isArray(json?.questions) ? json.questions : [],
      };
    },
    submitQuizAttempt: async (
      _: unknown,
      args: { quizId: string; answers: unknown; durationSeconds?: number },
      ctx: GraphQLContext
    ) => {
      const user = requireUser(ctx);
      const correct = (Array.isArray(args.answers) ? args.answers : []) as Array<{ isCorrect?: boolean }>;
      const score = correct.filter((a) => a.isCorrect).length;
      const total = correct.length;
      const accuracy = total === 0 ? 0 : Math.round((score / total) * 100);
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase!
        .from("quiz_attempts")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          quiz_id: args.quizId,
          score,
          total,
          accuracy,
          answers: args.answers,
          duration_seconds: args.durationSeconds ?? null,
          created_at: now,
        })
        .select()
        .single();
      if (error) throw new GraphQLError(error.message);
      return mapAttempt(data);
    },
  },

  QuizQuestion: {
    type: (q: { type?: string }) => q.type ?? "multiple_choice",
    analogy: (q: { analogy?: string }) => q.analogy,
    options: (q: { options?: unknown[] }) => q.options ?? [],
    correctAnswer: (q: { correctAnswer?: string }) => q.correctAnswer,
    explanation: (q: { explanation?: string }) => q.explanation,
    hint: (q: { hint?: string }) => q.hint,
    pythonSolution: (q: { pythonSolution?: string }) => q.pythonSolution,
    reasoning: (q: { reasoning?: string }) => q.reasoning,
    desmos: (q: { desmos?: unknown }) => q.desmos,
  },
};

function mapQuiz(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    subjectId: String(row.subject_id ?? "general"),
    title: String(row.title ?? "Untitled quiz"),
    difficulty: String(row.difficulty ?? "medium"),
    questions: Array.isArray(row.questions) ? row.questions : [],
    createdAt: String(row.created_at),
  };
}

function mapAttempt(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    quizId: String(row.quiz_id),
    userId: String(row.user_id),
    score: Number(row.score ?? 0),
    total: Number(row.total ?? 0),
    accuracy: Number(row.accuracy ?? 0),
    answers: row.answers ?? [],
    createdAt: String(row.created_at),
  };
}

function buildQuizPrompt(input: z.infer<typeof GenerateQuizInput>): string {
  const contextLine = input.contextText
    ? `Use this source material:\n"""\n${input.contextText.slice(0, 12_000)}\n"""\n\n`
    : "";
  return `${contextLine}Generate a ${input.difficulty} ${input.numQuestions}-question quiz on "${input.topic}". ` +
    `Mix question types: ${input.types.join(", ")}. ` +
    `Each multiple-choice question should have 4 options and one correct answer. ` +
    `Each short-answer question should have a clear correctAnswer and a model explanation. ` +
    `Return JSON: { questions: [{ id, type, question, options?, correctAnswer?, explanation, hint? }] }`;
}

function safeParseQuiz(raw: string): { questions: Array<Record<string, unknown>> } | null {
  const match = raw.match(/\{[\s\S]*"questions"[\s\S]*\}/);
  if (!match) return null;
  try {
    const json = JSON.parse(match[0]);
    if (!Array.isArray(json.questions)) return null;
    return json;
  } catch {
    return null;
  }
}

function safeParseJson(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

import { describe, expect, it } from "vitest";
import { bindings } from "@/lib/ai/tools/bindings";
import { getQuizAttempts } from "@analogix/shared/tools/handlers";

interface FakeAttempt {
  id: string;
  quiz_id: string | null;
  correct_answers: number;
  total_questions: number;
  quiz?: { subject_id: string; title: string } | null;
}

const makeFakeSupabase = (attempts: FakeAttempt[]) => {
  const select = () => ({
    eq: () => ({
      order: () => ({ data: attempts, error: null }),
    }),
  });
  return {
    from: () => ({ select }),
  } as never;
};

describe("getQuizAttempts", () => {
  it("embeds the related quiz subject so performance can be aggregated", async () => {
    const attempts: FakeAttempt[] = [
      {
        id: "a1",
        quiz_id: "q1",
        correct_answers: 4,
        total_questions: 5,
        quiz: { subject_id: "math", title: "Algebra quiz" },
      },
    ];
    const result = await getQuizAttempts("user", makeFakeSupabase(attempts));
    expect(result).toEqual(attempts);
    expect(result[0].quiz?.subject_id).toBe("math");
  });
});

describe("getQuizPerformance binding", () => {
  const ctx = (attempts: FakeAttempt[]) => ({
    userId: "user",
    supabase: makeFakeSupabase(attempts),
  });

  it("buckets attempts by the quiz subject, not an unknown bucket", async () => {
    const performance = await bindings.getQuizPerformance(
      ctx([
        {
          id: "a1",
          quiz_id: "q1",
          correct_answers: 4,
          total_questions: 5,
          quiz: { subject_id: "math", title: "Algebra quiz" },
        },
        {
          id: "a2",
          quiz_id: "q2",
          correct_answers: 1,
          total_questions: 5,
          quiz: { subject_id: "english", title: "Essay quiz" },
        },
        {
          id: "a3",
          quiz_id: "q1",
          correct_answers: 3,
          total_questions: 5,
          quiz: { subject_id: "math", title: "Algebra quiz" },
        },
      ]),
      { limit: 10 },
    );

    expect(performance).toHaveLength(2);
    const math = performance.find((p) => p.subjectId === "math");
    const english = performance.find((p) => p.subjectId === "english");
    expect(math).toMatchObject({ attempts: 2, correctAnswers: 7, totalQuestions: 10, accuracy: 70 });
    expect(english).toMatchObject({ attempts: 1, correctAnswers: 1, totalQuestions: 5, accuracy: 20 });
    expect(performance.some((p) => p.subjectId === "unknown")).toBe(false);
  });

  it("filters to a single subject when subjectId is provided", async () => {
    const performance = await bindings.getQuizPerformance(
      ctx([
        {
          id: "a1",
          quiz_id: "q1",
          correct_answers: 4,
          total_questions: 5,
          quiz: { subject_id: "math", title: "Algebra quiz" },
        },
        {
          id: "a2",
          quiz_id: "q2",
          correct_answers: 1,
          total_questions: 5,
          quiz: { subject_id: "english", title: "Essay quiz" },
        },
      ]),
      { subjectId: "math", limit: 10 },
    );

    expect(performance).toHaveLength(1);
    expect(performance[0]).toMatchObject({ subjectId: "math", attempts: 1 });
  });

  it("falls back to an unknown bucket when the quiz was deleted", async () => {
    const performance = await bindings.getQuizPerformance(
      ctx([{ id: "a1", quiz_id: null, correct_answers: 2, total_questions: 4, quiz: null }]),
      { limit: 10 },
    );
    expect(performance).toEqual([
      {
        subjectId: "unknown",
        attempts: 1,
        correctAnswers: 2,
        totalQuestions: 4,
        accuracy: 50,
      },
    ]);
  });
});

describe("getWeakAreas binding", () => {
  const ctx = (attempts: FakeAttempt[]) => ({
    userId: "user",
    supabase: makeFakeSupabase(attempts),
  });

  it("flags only subjects performing below 70% accuracy", async () => {
    const weak = await bindings.getWeakAreas(
      ctx([
        {
          id: "a1",
          quiz_id: "q1",
          correct_answers: 2,
          total_questions: 5,
          quiz: { subject_id: "science", title: "Chem quiz" },
        },
        {
          id: "a2",
          quiz_id: "q2",
          correct_answers: 4,
          total_questions: 5,
          quiz: { subject_id: "math", title: "Algebra quiz" },
        },
      ]),
      {},
    );

    expect(weak.map((w) => w.subjectId)).toEqual(["science"]);
  });
});
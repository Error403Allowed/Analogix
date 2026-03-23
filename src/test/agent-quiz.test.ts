import { describe, expect, it } from "vitest";
import { normaliseAgentQuizAction } from "@/lib/agentQuiz";

describe("normaliseAgentQuizAction", () => {
  it("normalises a valid quiz action", () => {
    const quiz = normaliseAgentQuizAction({
      type: "start_quiz",
      subjectId: "Physics",
      topic: "Momentum and impulse",
      difficulty: "advanced",
      numberOfQuestions: 8,
      timeLimitMinutes: 12,
    });

    expect(quiz).toEqual({
      subjectId: "physics",
      topic: "Momentum and impulse",
      difficulty: "advanced",
      numberOfQuestions: 8,
      timeLimitMinutes: 12,
    });
  });

  it("uses safe defaults and fallback subject ids", () => {
    const quiz = normaliseAgentQuizAction(
      {
        type: "start_quiz",
        topic: "Cell division",
        difficulty: "hard-mode",
        numberOfQuestions: 50,
        timeLimitMinutes: -5,
      },
      "biology",
    );

    expect(quiz).toEqual({
      subjectId: "biology",
      topic: "Cell division",
      difficulty: "intermediate",
      numberOfQuestions: 20,
      timeLimitMinutes: 0,
    });
  });

  it("maps beginner difficulty to foundational", () => {
    const quiz = normaliseAgentQuizAction({
      type: "start_quiz",
      subjectId: "english",
      difficulty: "beginner",
    });

    expect(quiz).toEqual({
      subjectId: "english",
      topic: "",
      difficulty: "foundational",
      numberOfQuestions: 5,
      timeLimitMinutes: 0,
    });
  });

  it("returns null when no subject can be resolved", () => {
    expect(normaliseAgentQuizAction({ type: "start_quiz" })).toBeNull();
  });
});

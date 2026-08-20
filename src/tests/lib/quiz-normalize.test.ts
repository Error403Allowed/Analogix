import { describe, it, expect } from "vitest";
import { normalizeQuizQuestions } from "@/lib/quiz-normalize";

describe("normalizeQuizQuestions", () => {
  it("converts SDK createQuiz tool shape (string options + numeric index) into flagged options", () => {
    const questions = normalizeQuizQuestions([
      {
        question: "Which city is the capital of France?",
        options: ["Paris", "London", "Rome", "Berlin"],
        correctAnswer: 0,
        explanation: "Paris is the capital of France.",
      },
      {
        question: "What is 2 + 2?",
        options: ["3", "4", "5"],
        correctAnswer: 1,
      },
    ]);

    expect(questions).toHaveLength(2);
    expect(questions[0].options).toEqual([
      { id: "opt-0-0", text: "Paris", isCorrect: true },
      { id: "opt-0-1", text: "London", isCorrect: false },
      { id: "opt-0-2", text: "Rome", isCorrect: false },
      { id: "opt-0-3", text: "Berlin", isCorrect: false },
    ]);
    expect(questions[0].correctAnswer).toBe("Paris");
    expect(questions[0].type).toBe("multiple_choice");
    expect(questions[1].options[1]).toMatchObject({ text: "4", isCorrect: true });
    expect(questions[1].correctAnswer).toBe("4");
  });

  it("does not erase index 0 (the `correctAnswer || \"\"` bug)", () => {
    const questions = normalizeQuizQuestions([
      { question: "True or false?", options: ["True", "False"], correctAnswer: 0 },
    ]);
    expect(questions[0].options[0].isCorrect).toBe(true);
    expect(questions[0].correctAnswer).toBe("True");
  });

  it("keeps legacy object options with explicit isCorrect flags", () => {
    const questions = normalizeQuizQuestions([
      {
        question: "Pick the even number.",
        options: [
          { id: "a", text: "3", isCorrect: false },
          { id: "b", text: "8", isCorrect: true },
          { id: "c", text: "9", isCorrect: false },
        ],
        analogy: "Even numbers come in pairs.",
      },
    ]);
    expect(questions[0].options[1]).toMatchObject({ id: "b", text: "8", isCorrect: true });
    expect(questions[0].correctAnswer).toBe("8");
    expect(questions[0].analogy).toBe("Even numbers come in pairs.");
  });

  it("matches a string correctAnswer against option text (case-insensitive)", () => {
    const questions = normalizeQuizQuestions([
      {
        question: "Capital of Australia?",
        options: ["Sydney", "Canberra", "Melbourne"],
        correctAnswer: "canberra",
      },
    ]);
    expect(questions[0].options[1]).toMatchObject({ text: "Canberra", isCorrect: true });
    expect(questions[0].correctAnswer).toBe("Canberra");
  });

  it("normalises type strings", () => {
    const questions = normalizeQuizQuestions([
      { question: "A", options: ["x", "y"], correctAnswer: 0, type: "multiple-choice" },
      { question: "B", options: ["x", "y"], correctAnswer: 0, type: "short_answer" },
      { question: "C", options: ["x", "y"], correctAnswer: 0, type: "multiple_select" },
      { question: "D", options: ["x", "y"], correctAnswer: 0, type: "true-false" },
    ]);
    expect(questions.map((q) => q.type)).toEqual([
      "multiple_choice",
      "short_answer",
      "multiple_select",
      "multiple_choice",
    ]);
  });

  it("handles missing/invalid input gracefully", () => {
    expect(normalizeQuizQuestions(undefined)).toEqual([]);
    expect(normalizeQuizQuestions("not an array")).toEqual([]);
    expect(normalizeQuizQuestions([{ question: "No options" }])).toMatchObject([
      { id: 0, question: "No options", options: [], correctAnswer: undefined },
    ]);
  });
});
"use client";

import { ChatMessage, UserContext } from "@/types/chat";
import { QuizAnswerInput, QuizData, QuizReview } from "@/types/quiz";
import { fetchJsonWithRetry } from "@/lib/fetch-wrapper";

/**
 * Wrapper for fetchJsonWithRetry that adds better error messages.
 * Kept for backward compatibility with existing codebase.
 */
const fetchJson = async <T>(
  url: string,
  body: unknown,
  timeoutMs: number,
): Promise<T> => {
  try {
    return await fetchJsonWithRetry<T>(url, {
      method: "POST",
      body,
      timeoutMs,
      maxRetries: 2,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(message);
  }
};

/**
 * THE MAIN FUNCTION: This is what we call when we want the AI to think.
 * It takes the chat history and some info about the user (hobbies, etc.)
 */
export const getGroqCompletion = async (
  messages: ChatMessage[],
  userContext?: Partial<UserContext> & {
    analogyIntensity?: number;
    responseLength?: number;
    analogyAnchor?: string;
  },
): Promise<ChatMessage> => {
  try {
    return await fetchJson<{ role: "assistant"; content: string }>(
      "/api/hf/chat",
      { messages, userContext },
      30000,
    );
  } catch (error) {
    const fallback: ChatMessage = {
      role: "assistant",
      content:
        `I couldn't reach the AI service. ${error instanceof Error ? error.message : ""}`.trim(),
    };
    return fallback;
  }
};

/**
 * RE-EXPLAIN: Ask Quizzy to explain the same concept in a completely different way.
 * Optionally pass a chosenAnchor (specific interest) the user picked.
 */
export const getReExplanation = async (
  messages: ChatMessage[],
  userContext?: Partial<UserContext> & {
    chosenAnchor?: string;
    previousExplanation?: string;
  },
): Promise<ChatMessage> => {
  try {
    return await fetchJson<{ role: "assistant"; content: string }>(
      "/api/hf/reexplain",
      { messages, userContext },
      30000,
    );
  } catch (error) {
    return {
      role: "assistant",
      content: `Couldn't reach the AI service. ${error instanceof Error ? error.message : ""}`.trim(),
    };
  }
};

/**
 * STUDY SCHEDULE: Generate a day-by-day study plan from upcoming events.
 */
export const generateStudySchedule = async (payload: {
  events: Array<{ title: string; date: string; type: string; subject?: string }>;
  grade?: string;
  state?: string;
}): Promise<{ schedule: StudyDay[]; summary: string }> => {
  try {
    const data = await fetchJson<{ schedule: StudyDay[]; summary: string }>(
      "/api/hf/study-schedule",
      payload,
      30000,
    );
    return { schedule: data.schedule || [], summary: data.summary || "" };
  } catch {
    return { schedule: [], summary: "" };
  }
};

export interface StudySession {
  subject: string;
  duration: string;
  focus: string;
  tip?: string;
}

export interface StudyDay {
  date: string;
  sessions: StudySession[];
}

/**
 * FLASHCARD GENERATION: Auto-generate flashcards from a chat conversation.
 */
export const generateFlashcards = async (
  conversationText: string,
  subjectId: string,
  grade?: string,
  count = 5,
): Promise<Array<{ front: string; back: string }>> => {
  try {
    const data = await fetchJson<{ flashcards: Array<{ front: string; back: string }> }>(
      "/api/hf/flashcard",
      { conversationText, subjectId, grade, count },
      20000,
    );
    return data.flashcards || [];
  } catch {
    return [];
  }
};

export const getAIGreeting = async (userName: string, streak: number) => {
  const stripEmojis = (text: string) =>
    text.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, " ").trim();

  try {
    const data = await fetchJson<{ text: string }>(
      "/api/hf/greeting",
      { userName, streak },
      15000,
    );
    return stripEmojis((data.text || `Welcome back, ${userName}.`).replace(/"/g, ""));
  } catch {
    return `Welcome back, ${userName}.`;
  }
};

export const getAIBannerPhrase = async (userName: string, subjects: string[]) => {
  const FALLBACK_LINES = [
    "Let's make light progress today.",
    "Pick one idea and explore it.",
    "Small steps still build skill.",
  ];

  const ensurePunctuation = (text: string) => {
    const lines = text.split("\n");
    return lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return trimmed;
        if (!/[.!?]$/.test(trimmed)) {
          return trimmed + ".";
        }
        return trimmed;
      })
      .join("\n");
  };

  const forceThreeLines = (text: string) => {
    const words = text.split(" ").filter(Boolean);
    if (words.length <= 3) return words.join("\n");
    const target = Math.ceil(words.length / 3);
    const lines = [
      words.slice(0, target).join(" "),
      words.slice(target, target * 2).join(" "),
      words.slice(target * 2).join(" "),
    ];
    return lines.map((line) => line.trim()).filter(Boolean).join("\n");
  };

  const enforceExactlyThreeLines = (text: string): string => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    if (lines.length === 3) {
      return lines.join("\n");
    }

    if (lines.length > 3) {
      return lines.slice(0, 3).join("\n");
    }

    return forceThreeLines(text);
  };

  const getRecentBanners = () => {
    try {
      return JSON.parse(localStorage.getItem("recentBannerPhrases") || "[]");
    } catch {
      return [];
    }
  };

  const storeBanner = (text: string) => {
    const recent = getRecentBanners();
    const next = [...recent, text].slice(-6);
    localStorage.setItem("recentBannerPhrases", JSON.stringify(next));
  };

  try {
    const data = await fetchJson<{ text: string }>(
      "/api/hf/banner",
      { userName, subjects },
      15000,
    );
    const raw = data.text || "";
    const withPunctuation = ensurePunctuation(raw);
    const enforced = enforceExactlyThreeLines(withPunctuation);
    const recent = getRecentBanners();
    if (recent.includes(enforced)) {
      return FALLBACK_LINES.join("\n");
    }
    const finalText = enforced || FALLBACK_LINES.join("\n");
    storeBanner(finalText);
    return finalText;
  } catch {
    const fallback = FALLBACK_LINES.join("\n");
    storeBanner(fallback);
    return fallback;
  }
};

/**
 * GENERATING AI QUIZZES: Creates a structured 5-question quiz with analogies.
 */
export const generateQuiz = async (
  input: string,
  userContext: {
    grade?: string;
    state?: string;
    hobbies: string[];
    subject?: string;
    difficulty?: string;
  },
  numberOfQuestions: number = 5,
  options?: {
    diversitySeed?: string;
    avoidQuestions?: string[];
  },
): Promise<QuizData | null> => {
  try {
    const data = await fetchJson<{ quiz: QuizData | null }>(
      "/api/hf/quiz",
      { input, userContext, numberOfQuestions, options },
      30000,
    );
    return data.quiz || null;
  } catch {
    return null;
  }
};

/**
 * AI GRADING: Evaluates a short answer response.
 */
export const gradeShortAnswer = async (
  question: string,
  targetAnswer: string,
  userAnswer: string,
) => {
  try {
    return await fetchJson<{ isCorrect: boolean; feedback: string }>(
      "/api/hf/grade",
      { question, targetAnswer, userAnswer },
      15000,
    );
  } catch {
    return { isCorrect: false, feedback: "Could not grade this answer." };
  }
};

/**
 * AI REVIEW: Generates end-of-quiz feedback for all questions.
 */
export const generateQuizReview = async (payload: {
  grade?: string;
  subject?: string;
  difficulty?: string;
  answers: QuizAnswerInput[];
}): Promise<QuizReview | null> => {
  try {
    const data = await fetchJson<{ review: QuizReview | null }>(
      "/api/hf/quiz-review",
      payload,
      30000,
    );
    return data.review || null;
  } catch {
    return null;
  }
};

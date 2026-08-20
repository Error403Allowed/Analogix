"use client";

import { ChatMessage, UserContext } from "@/types/chat";
import { QuizAnswerInput, QuizData, QuizReview } from "@/types/quiz";
import { fetchJsonWithRetry } from "@/lib/fetch-wrapper";
import { aiThrottle, heavyAiThrottle } from "@/lib/requestThrottle";

/**
 * Client-side AI service wrappers for the new @analogix core routes
 * (/api/ai/*). Replaces the legacy /api/groq/* wrappers. The main chat
 * conversation is handled by the AI SDK useChat transport instead.
 */

const fetchJson = async <T>(
  url: string,
  body: unknown,
  timeoutMs: number,
  useHeavyThrottle: boolean = false,
): Promise<T> => {
  const throttle = useHeavyThrottle ? heavyAiThrottle : aiThrottle;
  try {
    return await throttle.execute(async () =>
      fetchJsonWithRetry<T>(url, {
        method: "POST",
        body,
        timeoutMs,
        maxRetries: 0,
      }),
    );
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error",
      error instanceof Error ? { cause: error } : undefined,
    );
  }
};

/**
 * LIGHTWEIGHT SUBJECT DETECTION: Classifies a first message into a subject ID.
 */
export const detectSubject = async (userMessage: string) => {
  try {
    const data = await fetchJson<{ subject: string | null }>(
      "/api/ai/detect-subject",
      { message: userMessage.slice(0, 300) },
      15000,
    );
    return data.subject ?? null;
  } catch {
    return null;
  }
};

/**
 * LIGHTWEIGHT CHAT TITLE GENERATION: Names a study session from the conversation.
 */
export const generateChatTitle = async (conversation: string, latestMessage: string) => {
  try {
    const data = await fetchJson<{ title: string }>(
      "/api/ai/title",
      { conversation, latestMessage },
      15000,
    );
    return data.title || null;
  } catch {
    return null;
  }
};

/**
 * NON-STREAMING CHAT COMPLETION: Used for one-off assistant turns that don't
 * belong to the main conversation stream (e.g. "New topic" analogies).
 */
export const getAiCompletion = async (
  messages: ChatMessage[],
  userContext?: Partial<UserContext> & {
    analogyIntensity?: number;
    analogyAnchor?: string;
    responseLength?: number;
  },
): Promise<ChatMessage> => {
  try {
    return await fetchJson<{ role: "assistant"; content: string }>(
      "/api/ai/complete",
      { messages, userContext },
      30000,
    );
  } catch (error) {
    return {
      role: "assistant",
      content: `I couldn't reach the AI service. ${error instanceof Error ? error.message : ""}`.trim(),
    };
  }
};

/**
 * RE-EXPLAIN: Ask Analogix AI to explain the same concept in a different way.
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
      "/api/ai/reexplain",
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
      "/api/ai/flashcards/generate",
      { conversationText, subjectId, grade, count },
      20000,
    );
    return data.flashcards || [];
  } catch {
    return [];
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
 * STUDY SCHEDULE: Generate a day-by-day study plan from upcoming events.
 */
export const generateStudySchedule = async (payload: {
  events: Array<{ title: string; date: string; type: string; subject?: string }>;
  grade?: string;
  state?: string;
}): Promise<{ schedule: StudyDay[]; summary: string }> => {
  try {
    const data = await fetchJson<{ schedule: StudyDay[]; summary: string }>(
      "/api/ai/study-schedule",
      payload,
      30000,
    );
    return { schedule: data.schedule || [], summary: data.summary || "" };
  } catch {
    return { schedule: [], summary: "" };
  }
};

export const getAIGreeting = async (userName: string, streak: number) => {
  const stripEmojis = (text: string) =>
    text.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, " ").trim();

  try {
    const data = await fetchJson<{ text: string }>(
      "/api/ai/greeting",
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
      "/api/ai/banner",
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
      "/api/ai/quiz",
      { input, userContext, numberOfQuestions, options },
      60000,
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
      "/api/ai/grade",
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
      "/api/ai/quiz-review",
      payload,
      30000,
    );
    return data.review || null;
  } catch {
    return null;
  }
};

/**
 * QUIZ FROM DOCUMENT: Generates a quiz from uploaded document content.
 */
export const generateQuizFromDocument = async (payload: {
  documentContent: string;
  fileName?: string;
  subject?: string;
  grade?: string;
  numberOfQuestions?: number;
}): Promise<QuizData | null> => {
  try {
    const data = await fetchJson<{ quiz: QuizData | null }>(
      "/api/ai/quiz-from-doc",
      payload,
      45000,
      true, // Use heavy throttle for document processing
    );
    return data.quiz || null;
  } catch {
    return null;
  }
};

/**
 * FLASHCARDS FROM DOCUMENT: Generates flashcards from uploaded document content.
 */
export const generateFlashcardsFromDocument = async (payload: {
  documentContent: string;
  fileName?: string;
  subject?: string;
  grade?: string;
  count?: number;
}): Promise<Array<{ front: string; back: string }>> => {
  try {
    const data = await fetchJson<{ flashcards: Array<{ front: string; back: string }> }>(
      "/api/ai/flashcards/from-doc",
      payload,
      45000,
      true, // Use heavy throttle for document processing
    );
    return data.flashcards || [];
  } catch {
    return [];
  }
};

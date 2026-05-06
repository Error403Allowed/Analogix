"use client";

import { ChatMessage, UserContext } from "@/types/chat";
import { QuizAnswerInput, QuizData, QuizReview } from "@/types/quiz";
import { fetchJsonWithRetry } from "@/lib/fetch-wrapper";
import { aiThrottle, heavyAiThrottle } from "@/lib/requestThrottle";

interface GroqStreamClientData {
  personality?: unknown;
  memories?: unknown[];
}

// ─── Streaming helper ────────────────────────────────────────────────────────
// Calls /api/groq/chat-stream and yields token chunks as they arrive.
// Think of it like a garden hose — instead of waiting for a full bucket,
// water (tokens) flows out the moment it comes through.
export async function* getGroqStream(
  messages: ChatMessage[],
  userContext?: Partial<UserContext> & { analogyIntensity?: number; analogyAnchor?: string },
  localStorageData?: GroqStreamClientData | null,
): AsyncGenerator<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (localStorageData) {
    headers["x-client-data"] = JSON.stringify(localStorageData);
  }

  // Use throttle to prevent stream overload
  await aiThrottle.execute(async () => {
    // Just a placeholder to use the throttle - actual fetch happens below
  });

  const response = await fetch("/api/groq/chat-stream", {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, userContext }),
  });

  if (!response.ok) {
    // Try to parse error from response body
    let errorMessage = `Stream failed: ${response.status}`;
    try {
      const text = await response.text();
      const match = text.match(/data:.*"error":\s*"([^"]+)"/);
      if (match && match[1]) {
        errorMessage = match[1];
      }
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error("Stream response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      
      // Check for error in stream
      if (payload.includes('"error"')) {
        try {
          const parsed = JSON.parse(payload);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
        } catch {
          // Ignore parse errors, continue streaming
        }
      }
      
      try {
        const parsed = JSON.parse(payload);
        const token: string = parsed?.choices?.[0]?.delta?.content ?? "";
        if (token) yield token;
      } catch {
        // malformed chunk — skip
      }
    }
  }
}

/**
 * Get a quick preview response while user is typing.
 * Uses lightweight model for fast response (~500ms target).
 */
export const getGroqPreview = async (
  messages: ChatMessage[],
  userContext?: Partial<UserContext> & { analogyIntensity?: number; analogyAnchor?: string },
  localStorageData?: GroqStreamClientData | null,
): Promise<string> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (localStorageData) {
    headers["x-client-data"] = JSON.stringify(localStorageData);
  }

  const response = await fetch("/api/groq/chat-preview", {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, userContext }),
  });

  if (!response.ok) {
    return "";
  }

  try {
    const data = await response.json();
    return data.content || "";
  } catch {
    return "";
  }
};

/**
 * Wrapper for fetchJsonWithRetry that adds better error messages and throttling.
 * Kept for backward compatibility with existing codebase.
 */
const fetchJson = async <T>(
  url: string,
  body: unknown,
  timeoutMs: number,
  useHeavyThrottle: boolean = false,
): Promise<T> => {
  const throttle = useHeavyThrottle ? heavyAiThrottle : aiThrottle;
  
  try {
    return await throttle.execute(async () => {
      return await fetchJsonWithRetry<T>(url, {
        method: "POST",
        body,
        timeoutMs,
        maxRetries: 0, // Throttle handles retries
      });
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
      "/api/groq/chat",
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
 * RE-EXPLAIN: Ask Analogix AI to explain the same concept in a completely different way.
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
      "/api/groq/reexplain",
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
      "/api/groq/study-schedule",
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
      "/api/groq/flashcard",
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
      "/api/groq/greeting",
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
      "/api/groq/banner",
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
      "/api/groq/quiz",
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
      "/api/groq/grade",
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
      "/api/groq/quiz-review",
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
      "/api/groq/quiz-from-doc",
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
      "/api/groq/flashcard-from-doc",
      payload,
      45000,
      true, // Use heavy throttle for document processing
    );
    return data.flashcards || [];
  } catch {
    return [];
  }
};
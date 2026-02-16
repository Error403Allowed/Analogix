"use client";

import { ChatMessage, UserContext } from "@/types/chat";
import { QuizData } from "@/types/quiz";

const fetchJson = async <T>(
  url: string,
  body: unknown,
  timeoutMs: number,
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      let errMsg = `Request failed: ${response.status}`;
      if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        if (obj.error) {
          errMsg = String(obj.error);
        } else if (obj.message) {
          errMsg = String(obj.message);
        }
      }
      if (errMsg.startsWith("Request failed") && text) {
        errMsg = text;
      }
      throw new Error(errMsg);
    }
    return (data as T) ?? ({} as T);
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * THE MAIN FUNCTION: This is what we call when we want the AI to think.
 * It takes the chat history and some info about the user (hobbies, etc.)
 */
export const getHuggingFaceCompletion = async (
  messages: ChatMessage[],
  userContext?: Partial<UserContext> & {
    analogyIntensity?: number;
    responseLength?: number;
    analogyAnchor?: string;
  },
) => {
  try {
    return await fetchJson<{ role: "assistant"; content: string }>(
      "/api/hf/chat",
      { messages, userContext },
      30000,
    );
  } catch (error) {
    return {
      role: "assistant",
      content:
        `I couldn't reach the AI service. ${error instanceof Error ? error.message : ""}`.trim(),
    };
  }
};

/**
 * GENERATING DYNAMIC GREETINGS: This uses AI to create unique greetings for the user.
 */
export const getAIGreeting = async (userName: string, streak: number, mood?: string) => {
  const stripEmojis = (text: string) =>
    text.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, " ").trim();

  try {
    const data = await fetchJson<{ text: string }>(
      "/api/hf/greeting",
      { userName, streak, mood },
      15000,
    );
    return stripEmojis((data.text || `Welcome back, ${userName}.`).replace(/"/g, ""));
  } catch {
    return `Welcome back, ${userName}.`;
  }
};

export const getAIBannerPhrase = async (userName: string, subjects: string[], mood?: string) => {
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
      { userName, subjects, mood },
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
    hobbies: string[];
    subject?: string;
    mood?: string;
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

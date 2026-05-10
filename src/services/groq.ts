"use client";

import { ChatMessage, UserContext } from "@/types/chat";
import { QuizAnswerInput, QuizData, QuizReview } from "@/types/quiz";
import { fetchJsonWithRetry } from "@/lib/fetch-wrapper";
import { aiThrottle, heavyAiThrottle } from "@/lib/requestThrottle";

interface GroqStreamClientData {
  personality?: unknown;
  memories?: unknown[];
}

// Token estimation: ~1 token per 4 characters
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Task-based context budgets - different sizes for different tasks
interface TaskBudget {
  maxTokens: number;
  maxMessages: number;
  maxMemories: number;
  includePersonality: boolean;
  includeMemories: boolean;
}

const TASK_BUDGETS: Record<string, TaskBudget> = {
  // Lightweight: just the message, minimal context
  lightweight: {
    maxTokens: 1024,
    maxMessages: 2,
    maxMemories: 0,
    includePersonality: false,
    includeMemories: false,
  },
  // Default: normal chat, balance speed/quality
  default: {
    maxTokens: 4096,
    maxMessages: 4,
    maxMemories: 2,
    includePersonality: true,
    includeMemories: true,
  },
  // Reasoning: more context for complex questions
  reasoning: {
    maxTokens: 6144,
    maxMessages: 6,
    maxMemories: 3,
    includePersonality: true,
    includeMemories: true,
  },
  // Deep: full context for research/analysis
  deep: {
    maxTokens: 8192,
    maxMessages: 10,
    maxMemories: 5,
    includePersonality: true,
    includeMemories: true,
  },
};

// Determine task type based on message
function classifyTask(message: string): string {
  const len = message.length;
  const words = message.split(/\s+/).length;
  
  // Trivial messages get lightweight treatment
  if (len < 20 || words <= 2) return "lightweight";
  
  // Reasoning questions
  if (/\b(why|how|explain|show.*work|derive|solve|prove|calculate)\b/i.test(message)) {
    return "reasoning";
  }
  
  // Research/analysis
  if (/\b(analyse|analyze|research|compare|contrast|review|study)\b/i.test(message)) {
    return "deep";
  }
  
  // Default for everything else
  return "default";
}

// Trim context to fit within token budget
function trimToBudget(
  messages: ChatMessage[],
  budget: TaskBudget,
  localStorageData?: GroqStreamClientData | null
): { messages: ChatMessage[]; memories: unknown[] } {
  let tokenCount = 0;
  const budgetedMemories: unknown[] = [];
  
  // Take only recent N messages
  const recentMessages = messages.slice(-budget.maxMessages);
  
  // If still too big, truncate each message
  const maxTokensPerMessage = Math.floor(budget.maxTokens / recentMessages.length);
  const trimmedMessages: ChatMessage[] = [];
  
  for (const msg of recentMessages) {
    const msgTokens = estimateTokens(msg.content);
    if (tokenCount + msgTokens <= budget.maxTokens) {
      trimmedMessages.push(msg);
      tokenCount += msgTokens;
    }
    // Stop if we're over budget
    if (tokenCount >= budget.maxTokens) break;
  }
  
  // Budget memories if requested
  if (budget.includeMemories && budget.maxMemories > 0 && localStorageData?.memories) {
    const memories = localStorageData.memories as Array<{ content?: string }>;
    for (const mem of memories.slice(0, budget.maxMemories)) {
      if (mem.content) {
        const memTokens = estimateTokens(mem.content);
        if (tokenCount + memTokens <= budget.maxTokens - 500) { // Leave buffer
          budgetedMemories.push(mem);
          tokenCount += memTokens;
        }
      }
    }
  }
  
  return { messages: trimmedMessages, memories: budgetedMemories };
}

// ─── Streaming helper ────────────────────────────────────────────────────────
// Calls /api/groq/chat-stream and yields token chunks as they arrive.
export async function* getGroqStream(
  messages: ChatMessage[],
  userContext?: Partial<UserContext> & { analogyIntensity?: number; analogyAnchor?: string },
  localStorageData?: GroqStreamClientData | null,
): AsyncGenerator<string> {
  // ── CLASSIFY TASK and BUDGET ──
  const userMessage = messages[messages.length - 1]?.content || "";
  const task = classifyTask(userMessage);
  const budget = TASK_BUDGETS[task] || TASK_BUDGETS.default;
  
  // ── TRIM TO TOKEN BUDGET ──
  const { messages: budgetedMessages, memories: budgetedMemories } = trimToBudget(messages, budget, localStorageData);

  // Build client data with budgeted context
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (localStorageData) {
    headers["x-client-data"] = JSON.stringify({
      personality: budget.includePersonality ? localStorageData.personality : null,
      memories: budget.includeMemories ? budgetedMemories : [],
    });
  }

  // Sane throttling - prevent spam overload while keeping responses fast
  await aiThrottle.execute(async () => {
    // Just a placeholder to use the throttle - actual fetch happens below
  });

  const response = await fetch("/api/groq/chat-stream", {
    method: "POST",
    headers,
    body: JSON.stringify({ messages: budgetedMessages, userContext }),
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
  // ── CLASSIFY TASK and BUDGET ──
  const userMessage = messages[messages.length - 1]?.content || "";
  const task = classifyTask(userMessage);
  const budget = TASK_BUDGETS[task] || TASK_BUDGETS.default;
  
  // ── TRIM TO TOKEN BUDGET ──
  const { messages: budgetedMessages } = trimToBudget(messages, budget);
  
  try {
    return await fetchJson<{ role: "assistant"; content: string }>(
      "/api/groq/chat",
      { messages: budgetedMessages, userContext },
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
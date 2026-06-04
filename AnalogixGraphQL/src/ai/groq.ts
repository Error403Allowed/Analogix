import Groq from "groq-sdk";
import { env } from "../env.js";
import { logger } from "../logger.js";

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    client = new Groq({ apiKey: env.groq.primaryKey });
  }
  return client;
}

export interface GroqChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CallGroqOptions {
  messages: GroqChatMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

/**
 * Single-shot completion — returns the full text after the model finishes.
 * Used by every non-streaming AI mutation (generateQuiz, generateFlashcards,
 * quizReview, etc.).
 */
export async function callGroqChat(opts: CallGroqOptions): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: opts.model ?? DEFAULT_MODEL,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? 1500,
    temperature: opts.temperature ?? 0.7,
    stream: false,
  });
  return response.choices[0]?.message?.content ?? "";
}

/**
 * Streams tokens from the AI. Used by the chatStream subscription.
 * Yields one string at a time. The caller is responsible for assembling
 * tokens and persisting the final message.
 */
export async function* streamGroqChat(opts: {
  messages: GroqChatMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): AsyncGenerator<string, void, void> {
  const client = getClient();
  const stream = await client.chat.completions.create({
    model: opts.model ?? DEFAULT_MODEL,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? 1500,
    temperature: opts.temperature ?? 0.7,
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/**
 * Returns which Groq model to use for a given task type.
 * Mirrors the routing logic in AnalogixWeb/src/app/api/groq/_utils.ts.
 */
export function classifyTaskType(messages: GroqChatMessage[], subject?: string): "coding" | "reasoning" | "general" {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content?.toLowerCase() ?? "";
  if (/code|function|debug|compile|script|class|algorithm/i.test(last)) return "coding";
  if (/(math|prove|derivative|integral|theorem|equation|calculate)/i.test(last) || subject === "mathematics") return "reasoning";
  return "general";
}

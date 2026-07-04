import Groq from "groq-sdk";
import { env } from "../env.js";
import { logger } from "../logger.js";

const ALLOWED_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "qwen-2.5-coder-32b",
  "deepseek-r1-distill-llama-70b",
  "mixtral-8x7b-32768",
]);

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

let primaryClient: Groq | null = null;
let secondaryClient: Groq | null = null;

function getPrimaryClient(): Groq {
  if (!primaryClient) {
    primaryClient = new Groq({ apiKey: env.groq.primaryKey });
  }
  return primaryClient;
}

function getSecondaryClient(): Groq | null {
  if (!env.groq.secondaryKey) return null;
  if (!secondaryClient) {
    secondaryClient = new Groq({ apiKey: env.groq.secondaryKey });
  }
  return secondaryClient;
}

function validateModel(model?: string): string {
  if (!model) return DEFAULT_MODEL;
  const lower = model.toLowerCase();
  for (const allowed of ALLOWED_MODELS) {
    if (allowed.toLowerCase() === lower || allowed.toLowerCase().includes(lower) || lower.includes(allowed.toLowerCase())) {
      return allowed;
    }
  }
  logger.warn({ model }, "[groq] Invalid model requested, falling back to default");
  return DEFAULT_MODEL;
}

async function executeWithFallback<T>(
  fn: (client: Groq) => Promise<T>,
  attempt = 0
): Promise<T> {
  const client = getPrimaryClient();
  try {
    const result = await Promise.race([
      fn(client),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Groq API timeout")), REQUEST_TIMEOUT_MS)
      ),
    ]);
    return result;
  } catch (err) {
    const isRateLimit = err instanceof Error && (err.message.includes("429") || err.message.includes("rate_limit"));
    const isTimeout = err instanceof Error && err.message === "Groq API timeout";
    const isServerError = err instanceof Error && (err.message.includes("500") || err.message.includes("502") || err.message.includes("503"));

    if ((isRateLimit || isTimeout || isServerError) && attempt < MAX_RETRIES) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      logger.warn({ attempt, err: (err as Error).message }, "[groq] Retrying with backoff");
      await new Promise((resolve) => setTimeout(resolve, backoffMs));

      // Try secondary key on rate limit or timeout
      if ((isRateLimit || isTimeout) && getSecondaryClient()) {
        logger.info("[groq] Failing over to secondary API key");
        try {
          return await Promise.race([
            fn(getSecondaryClient()!),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Groq API timeout")), REQUEST_TIMEOUT_MS)
            ),
          ]);
        } catch (secondaryErr) {
          logger.error({ err: secondaryErr }, "[groq] Secondary key also failed");
          return executeWithFallback(fn, attempt + 1);
        }
      }

      return executeWithFallback(fn, attempt + 1);
    }

    throw err;
  }
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

/**
 * Single-shot completion with timeout, retry, and secondary key failover.
 */
export async function callGroqChat(opts: CallGroqOptions): Promise<string> {
  const model = validateModel(opts.model);
  const response = await executeWithFallback((client) =>
    client.chat.completions.create({
      model,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 1500,
      temperature: opts.temperature ?? 0.7,
      stream: false,
    })
  );
  return response.choices[0]?.message?.content ?? "";
}

/**
 * Streams tokens from the AI with timeout and retry.
 * Used by the chatStream subscription.
 */
export async function* streamGroqChat(opts: {
  messages: GroqChatMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): AsyncGenerator<string, void, void> {
  const model = validateModel(opts.model);
  const stream = await executeWithFallback((client) =>
    client.chat.completions.create({
      model,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 1500,
      temperature: opts.temperature ?? 0.7,
      stream: true,
    })
  );
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/**
 * Returns which Groq model to use for a given task type.
 */
export function classifyTaskType(messages: GroqChatMessage[], subject?: string): "coding" | "reasoning" | "general" {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content?.toLowerCase() ?? "";
  if (/code|function|debug|compile|script|class|algorithm/i.test(last)) return "coding";
  if (/(math|prove|derivative|integral|theorem|equation|calculate)/i.test(last) || subject === "mathematics") return "reasoning";
  return "general";
}

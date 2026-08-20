import { createGroq } from "@ai-sdk/groq";
import type { GroqProvider } from "@ai-sdk/groq";

// ============================================================================
// MODEL REGISTRY
// ============================================================================

const normalizeModelId = (modelId: string): string => {
  const modelMap: Record<string, string> = {
    // Current production lineup (verified Aug 2026)
    "gpt-oss-120b": "openai/gpt-oss-120b",
    "gpt-oss-20b": "openai/gpt-oss-20b",
    "qwen-3.6-27b": "qwen/qwen3.6-27b",
    // Legacy IDs retained so previously-saved selections keep resolving
    "llama-3.1-8b": "openai/gpt-oss-20b",
    "llama-3.1-70b": "openai/gpt-oss-120b",
    "llama-3.3-70b": "openai/gpt-oss-120b",
    "llama3-8b": "openai/gpt-oss-20b",
    "llama3-70b": "openai/gpt-oss-120b",
    "llama-4-scout": "qwen/qwen3.6-27b",
    "qwen-3-32b": "qwen/qwen3.6-27b",
  };
  if (modelId.includes("/")) return modelId;
  return modelMap[modelId] || modelId;
};

export const DEFAULT_MODEL = "openai/gpt-oss-120b";
export const DEFAULT_FALLBACK_MODEL = "openai/gpt-oss-20b";
export const HIGH_THROUGHPUT_MODEL = "qwen/qwen3.6-27b";
export const LIGHTWEIGHT_MODEL = "openai/gpt-oss-20b";
export const REASONING_MODEL = "qwen/qwen3.6-27b";
export const CODING_MODEL = "openai/gpt-oss-120b";
export const LAST_RESORT_MODEL = "openai/gpt-oss-20b";

export const isReasoningModel = (model: string): boolean =>
  model.toLowerCase().includes("qwen");

export const resolveModelForUser = (modelId?: string | null): string => {
  if (!modelId || modelId === "auto") return DEFAULT_MODEL;
  return normalizeModelId(modelId);
};

// Model metadata. These sit ABOVE the per-request budget so the request budget
// (input + output) is the binding constraint, not the model's own limit.
export const MODEL_OUTPUT_LIMITS: Record<string, number> = {
  "openai/gpt-oss-20b": 8192,
  "openai/gpt-oss-120b": 8192,
  "qwen/qwen3.6-27b": 8192,
};

export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "openai/gpt-oss-20b": 131072,
  "openai/gpt-oss-120b": 131072,
  "qwen/qwen3.6-27b": 131072,
};

// Conservative per-request caps based on Groq free-tier limits (org TPM cap is
// 8000). A request whose input + max_tokens exceeds 8000 is rejected with 413.
export const MODEL_REQUEST_TOKEN_BUDGETS: Record<string, number> = {
  "openai/gpt-oss-20b": 7600,
  "openai/gpt-oss-120b": 7600,
  "qwen/qwen3.6-27b": 7600,
};

export const MIN_COMPLETION_TOKENS = 256;

// ============================================================================
// PROVIDER POOL (multi-key rotation)
// ============================================================================

const BASE_URL =
  process.env.GROQ_CHAT_URL?.replace(/\/chat\/completions\/?$/, "") || undefined;

const apiKeys = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
].filter((key): key is string => Boolean(key));

export const getConfiguredKeyCount = (): number => apiKeys.length;

export const assertApiKeys = (): void => {
  if (apiKeys.length === 0) {
    throw new Error(
      "Missing GROQ_API_KEY environment variable. Please check your .env.local file.",
    );
  }
};

const providers: GroqProvider[] = apiKeys.map((apiKey) =>
  createGroq({ apiKey, ...(BASE_URL ? { baseURL: BASE_URL } : {}) }),
);

// Keys that recently failed authentication are skipped for a cooldown window.
const DEAD_KEY_COOLDOWN_MS = 5 * 60 * 1000;
const deadKeysUntil = new Map<number, number>();

export const isKeyDead = (keyIndex: number): boolean => {
  const deadUntil = deadKeysUntil.get(keyIndex);
  if (!deadUntil) return false;
  if (Date.now() >= deadUntil) {
    deadKeysUntil.delete(keyIndex);
    return false;
  }
  return true;
};

export const markKeyDead = (keyIndex: number): void => {
  deadKeysUntil.set(keyIndex, Date.now() + DEAD_KEY_COOLDOWN_MS);
  console.error(
    `[Groq] Marking key #${keyIndex + 1} as dead for ${DEAD_KEY_COOLDOWN_MS / 60000}min (auth failure)`,
  );
};

// Simple round-robin: get next live key index, wrapping around.
const nextKeyIndex = (() => {
  let index = 0;
  return () => {
    if (apiKeys.length === 0) return 0;
    for (let attempt = 0; attempt < apiKeys.length; attempt++) {
      const currentIndex = index % apiKeys.length;
      index = (index + 1) % apiKeys.length;
      if (!isKeyDead(currentIndex)) return currentIndex;
    }
    return 0;
  };
})();

export interface ModelProvider {
  keyIndex: number;
  provider: GroqProvider;
}

export const getNextProvider = (): ModelProvider => {
  assertApiKeys();
  const keyIndex = nextKeyIndex();
  return { keyIndex, provider: providers[keyIndex] };
};

export const getProviderAtIndex = (keyIndex: number): GroqProvider | null => {
  if (apiKeys.length === 0 || keyIndex < 0 || keyIndex >= apiKeys.length) {
    return null;
  }
  return providers[keyIndex];
};

export const getGroqModel = (
  modelId: string,
  keyIndex?: number,
): { model: ReturnType<GroqProvider>; keyIndex: number } => {
  const provider =
    keyIndex !== undefined
      ? getProviderAtIndex(keyIndex)
      : getNextProvider().provider;
  if (!provider) {
    throw new Error("No API key available");
  }
  return { model: provider(modelId), keyIndex: keyIndex ?? 0 };
};

// ============================================================================
// MODEL SELECTION + TASK CLASSIFICATION
// ============================================================================

const BLOCKED_MODELS = ["gemma2-9b", "gemma-2-9b-it", "gemma2-9b-it"];

const filterBlockedModels = (models: string[]): string[] =>
  models
    .map((m) => normalizeModelId(m))
    .filter((m) => !BLOCKED_MODELS.includes(m.toLowerCase()));

// Simple greetings/small talk that should use the fast path.
const SIMPLE_MESSAGES = [
  "hi", "hello", "hey", "greetings", "g'day", "hiya", "heya",
  "good morning", "good afternoon", "good evening",
  "how are you", "what's up", "how's it going", "how do you do",
  "yo", "sup", "what's happening", "nice to meet you",
  "thanks", "thank you", "cheers", "appreciate it",
  "bye", "goodbye", "see you", "catch you later", "talk soon",
  "ok", "okay", "sure", "yes", "no", "maybe", "alright",
  "please", "help", "quick question", "one thing",
];

const isSimpleMessage = (messages: { role: string; content: string }[]) => {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length !== 1) return false;
  const content = userMessages[0].content.toLowerCase().trim();
  if (content.length > 50) return false;
  return SIMPLE_MESSAGES.some((simple) => content.includes(simple));
};

export const isSimpleGreeting = (messages: { role: string; content: string }[]) =>
  isSimpleMessage(messages);

export type TaskType = "coding" | "reasoning" | "lightweight" | "default";

export const classifyTaskType = (
  messages: { role: string; content: string }[],
  subject?: string,
): TaskType => {
  if (subject === "computing") return "coding";
  const reasoningSubjects = ["math", "physics", "chemistry", "biology", "engineering"];
  if (subject && reasoningSubjects.includes(subject)) return "reasoning";

  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  const latestMessage = userMessages[userMessages.length - 1] || "";

  if (/```[\s\S]*```/.test(latestMessage) || /^\s*```/.test(latestMessage)) {
    return "coding";
  }
  if (/\b(function|class|interface|const|let|var|import|export|return|async|await)\b/.test(latestMessage)) {
    return "coding";
  }
  if (/\$[^$]+\$|\\\(|\\\[|\\\d+|sin|cos|tan|∫|∑|√|π|θ|φ|λ|Δ|∂|∇/.test(latestMessage)) {
    return "reasoning";
  }
  if (latestMessage.length < 50 && isSimpleMessage(messages)) {
    return "lightweight";
  }
  return "default";
};

export const getModelsForTaskType = (
  taskType: TaskType,
  userModel?: string | null,
  estimatedTokens?: number,
): string[] => {
  if (userModel && userModel !== "auto") {
    const normalizedModel = normalizeModelId(userModel);
    if (!BLOCKED_MODELS.includes(normalizedModel.toLowerCase())) {
      return [normalizedModel];
    }
  }
  const defaultTokenBudget = MODEL_REQUEST_TOKEN_BUDGETS[DEFAULT_MODEL] || 12000;
  if (estimatedTokens && estimatedTokens > defaultTokenBudget) {
    return filterBlockedModels([HIGH_THROUGHPUT_MODEL, DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL]);
  }
  const CONTEXT_LIMIT = 8192;
  if (estimatedTokens && estimatedTokens > CONTEXT_LIMIT * 0.7) {
    return filterBlockedModels([DEFAULT_MODEL, HIGH_THROUGHPUT_MODEL, DEFAULT_FALLBACK_MODEL]);
  }
  let models: string[];
  switch (taskType) {
    case "coding":
      models = [CODING_MODEL, HIGH_THROUGHPUT_MODEL, DEFAULT_FALLBACK_MODEL];
      break;
    case "reasoning":
      models = [REASONING_MODEL, DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL];
      break;
    case "lightweight":
      models = [LIGHTWEIGHT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL];
      break;
    case "default":
    default:
      models = [DEFAULT_MODEL, HIGH_THROUGHPUT_MODEL, DEFAULT_FALLBACK_MODEL];
  }
  return filterBlockedModels(models);
};

// GPT-OSS models reason by default and reasoning tokens count against the same
// output budget as the visible answer. "low" effort keeps the chain-of-thought
// short so general chat has room to answer. Qwen only accepts "default".
export const getReasoningEffort = (model: string): "none" | "default" | "low" | "medium" | "high" => {
  if (isReasoningModel(model)) return "default";
  return "low";
};

export const getProviderOptionsForModel = (model: string) => ({
  groq: {
    reasoningEffort: getReasoningEffort(model),
  },
});
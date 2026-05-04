// ============================================================================
// CONFIGURATION: Where we send AI requests and which models to use
// ============================================================================

const GROQ_CHAT_URL =
  process.env.GROQ_CHAT_URL || "https://api.groq.com/openai/v1/chat/completions";

// Groq model lineup — all free tier, best-in-class per task
// Each model has its own separate TPD (tokens/day) quota — spread load across them
const DEFAULT_MODEL            = "meta-llama/llama-4-scout-17b-16e-instruct"; // Llama 4 Scout, 128K ctx
const DEFAULT_FALLBACK_MODEL   = "llama-3.3-70b-versatile";                    // Llama 3.3 
const HIGH_TOKEN_MODEL        = "openai/gpt-oss-120b";                          // GPT-OSS 120B — 65K+ completion tokens

// Compound AI systems - for agentic workflows and multi-tool tasks
const COMPOUND_MODEL          = "groq/compound";                           // Full agentic - up to 10 tool calls
const COMPOUND_MINI_MODEL     = "groq/compound-mini";                      // Lightweight - 1 tool call, 3x faster

// Legacy/DEPRECATED (kept for fallback)
const REASONING_MODEL          = "deepseek-r1-distill-llama-70b";           // DeepSeek R1 
const LIGHTWEIGHT_MODEL        = "llama-3.1-8b-instant";                   // Fast, cheap
const LAST_RESORT_MODEL        = "llama-3.1-8b-instant";                    // Always works

// User-selected model (from client) — if provided, use this instead of auto-selection
let userSelectedModel: string | null = null;

/**
 * Set the user-selected model
 * @param model The model string to use (e.g., "llama-3.3-70b-versatile"), or null to use auto-selection
 */
export const setUserSelectedModel = (model: string | null) => {
  userSelectedModel = model;
};

/**
 * Get the user-selected model, or null if auto-selection is enabled
 */
export const getUserSelectedModel = (): string | null => {
  return userSelectedModel;
};

// Model-specific token limits (safe values below actual limits)
// Llama 4 Scout: 128K context, 8K output max
// Llama 3.3 70B: 128K context, 8K output max
// GPT-OSS 120B: 65K+ completion tokens
// We use conservative limits to avoid cutoff errors
const MODEL_OUTPUT_LIMITS: Record<string, number> = {
  "meta-llama/llama-4-scout-17b-16e-instruct": 8192,
  "meta-llama/llama-4-maverick-17b-128e-instruct": 8192,
  "llama-3.3-70b-versatile": 8192,
  "deepseek-r1-distill-llama-70b": 8192,
  "llama-3.1-8b-instant": 4096,
  "openai/gpt-oss-120b": 32000,
};

const getSafeMaxTokens = (model: string, requested: number): number => {
  const limit = MODEL_OUTPUT_LIMITS[model] || 4096;
  // Use 90% of limit to leave room for safety margin
  return Math.min(requested, Math.floor(limit * 0.9));
};

// Type definition: what kind of question is the user asking?
export type TaskType = "coding" | "reasoning" | "default" | "lightweight" | "highToken" | "compound" | "compoundMini";

// ============================================================================
// SMART QUESTION DETECTION: How we figure out what type of question it is
// ============================================================================

// Words that indicate a CODING question
const CODING_KEYWORDS = [
  "code", "coding", "program", "programming", "function", "method", "class",
  "debug", "debugging", "algorithm", "script", "syntax", "compiler", "variable",
  "api", "endpoint", "database", "sql", "query", "javascript", "python", "java",
  "typescript", "react", "node", "html", "css", "git", "github", "array", "object", 
  "loop", "json", "const", "let", "var", "npm", "component", "interface"
];

// Words that indicate a REASONING / MATH / SCIENCE question
// Keep this minimal - let the AI handle the actual reasoning
const REASONING_KEYWORDS = [
  "solve", "calculate", "find", "prove", "derivative", "integral",
  "equation", "formula", "quadratic", "algebra", "geometry", "calculus",
  "physics", "chemistry", "biology", "science"
];

// Simple greetings/small talk that should use fast path
const SIMPLE_MESSAGES = [
  "hi", "hello", "hey", "greetings", "good morning", "good afternoon",
  "good evening", "how are you", "what's up", "how's it going", "yo",
  "thanks", "thank you", "bye", "goodbye", "see you", "ok", "okay",
  "sure", "yes", "no", "maybe", "please", "help", "quick question"
];

const isSimpleMessage = (messages: Array<{ role: string; content: string }>): boolean => {
  // Check if there's only one short user message
  const userMessages = messages.filter(m => m.role === "user");
  if (userMessages.length !== 1) return false;
  
  const content = userMessages[0].content.toLowerCase().trim();
  if (content.length > 50) return false;
  
  return SIMPLE_MESSAGES.some(simple => content.includes(simple));
};

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

const apiKeys = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
].filter((key): key is string => Boolean(key));

// Simple round-robin: get next key index, wrapping around
const getNextApiKeyIndex = (() => {
  let index = 0;
  return () => {
    if (apiKeys.length === 0) return 0;
    const currentIndex = index % apiKeys.length;
    index = (index + 1) % apiKeys.length;
    return currentIndex;
  };
})();

const getApiKeyAtIndex = (index: number) => {
  if (apiKeys.length === 0 || index < 0 || index >= apiKeys.length) return null;
  return apiKeys[index];
};

// ============================================================================
// RATE LIMITER: Token bucket to prevent API overload
// ============================================================================

// Groq free tier limits (adjust if you have different limits)
const RATE_LIMIT_CONFIG = {
  // Requests per minute per API key (conservative to avoid 429s)
  rpmPerKey: 10,
  // Tokens per minute per API key — Groq free tier is 6000 TPM per key
  // We use 14000 as a generous local-side cap (actual enforcement is by Groq).
  // The local bucket is just a soft throttle, not a hard gate.
  tpmPerKey: 30000,
  // Minimum delay between requests (ms) - spreads requests out
  minDelayMs: 100,
  // Maximum concurrent requests per key — set high enough that normal
  // chat usage (2-3 messages in flight) never gets blocked locally.
  // Groq's own 429s handle real overload; this just prevents runaway loops.
  maxConcurrentPerKey: 10,
};

// Token bucket state per API key
interface TokenBucket {
  tokens: number;
  lastRefill: number;
  concurrentRequests: number;
}

const keyBuckets = new Map<number, TokenBucket>();

const getOrCreateBucket = (keyIndex: number): TokenBucket => {
  if (!keyBuckets.has(keyIndex)) {
    keyBuckets.set(keyIndex, {
      tokens: RATE_LIMIT_CONFIG.tpmPerKey,
      lastRefill: Date.now(),
      concurrentRequests: 0,
    });
  }
  return keyBuckets.get(keyIndex)!;
};

const refillTokens = (bucket: TokenBucket) => {
  const now = Date.now();
  const elapsedMs = now - bucket.lastRefill;
  // Refill at per-key rate only (not multiplied by key count)
  const tokensPerMs = RATE_LIMIT_CONFIG.tpmPerKey / 60000;
  const newTokens = Math.min(
    RATE_LIMIT_CONFIG.tpmPerKey,
    bucket.tokens + elapsedMs * tokensPerMs
  );
  bucket.tokens = newTokens;
  bucket.lastRefill = now;
};

const waitForToken = async (
  keyIndex: number,
  requiredTokens: number
): Promise<boolean> => {
  const bucket = getOrCreateBucket(keyIndex);
  refillTokens(bucket);

  // Never block on concurrent requests locally — Groq handles real overload via 429.
  // Just track it for observability.
  bucket.concurrentRequests++;

  // Deduct tokens if available; if not, let it through anyway (soft throttle only).
  const effectiveRequired = Math.min(requiredTokens, RATE_LIMIT_CONFIG.tpmPerKey * 0.9);
  if (bucket.tokens >= effectiveRequired) {
    bucket.tokens -= effectiveRequired;
  } else {
    // Bucket empty — let it through, Groq will 429 if truly overloaded
    bucket.tokens = 0;
  }

  return true;
};

const releaseRequest = (keyIndex: number) => {
  const bucket = getOrCreateBucket(keyIndex);
  bucket.concurrentRequests = Math.max(0, bucket.concurrentRequests - 1);
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Global request queue to serialize requests when rate limited
const requestQueue: Array<() => void> = [];
const isProcessingQueue = false;

const enqueueRequest = (): Promise<void> => {
  // Don't queue at all — let requests run concurrently.
  // The token bucket and Groq's own 429s handle actual overload.
  // The old serialisation was the primary cause of "can't reach AI service"
  // on second messages (message 2 would queue behind message 1's stream).
  return Promise.resolve();
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

const parseErrorMessage = async (response: Response) => {
  try {
    const raw = await response.text();
    if (!raw) return response.statusText || `HTTP ${response.status}`;

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return parsed;
      if (parsed?.error) {
        if (typeof parsed.error === "string") {
          // Enhance token limit error messages
          if (parsed.error.toLowerCase().includes("token") || parsed.error.toLowerCase().includes("length")) {
            return "Response too long - the AI generated more content than allowed. Please try a shorter request or break it into parts.";
          }
          return parsed.error;
        }
        if (typeof parsed.error === "object" && parsed.error.message) {
          // Enhance token limit error messages
          const msg = parsed.error.message.toLowerCase();
          if (msg.includes("token") || msg.includes("length") || msg.includes("maximum")) {
            return "Response too long - the AI generated more content than allowed. Please try a shorter request or break it into parts.";
          }
          return parsed.error.message;
        }
        return JSON.stringify(parsed.error);
      }
      if (parsed?.message) return parsed.message;
      return JSON.stringify(parsed);
    } catch {
      return raw.slice(0, 500); // Return first 500 chars of raw response
    }
  } catch (e) {
    console.error("[parseErrorMessage] Failed to parse error response:", e);
    return response.statusText || `HTTP ${response.status}`;
  }
};

export const assertApiKeys = () => {
  if (apiKeys.length === 0) {
    const errorMsg = "Missing GROQ_API_KEY environment variable. Please check your .env.local file.";
    console.error("[assertApiKeys]", errorMsg);
    throw new Error(errorMsg);
  }
};

export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Unknown error occurred";
};

// ============================================================================
// QUESTION CLASSIFIER
// ============================================================================

export const classifyTaskType = (
  messages: Array<{ role: string; content: string }>,
  subject?: string
): TaskType => {
  // 1. Explicit subject-based overrides (Highest priority)
  if (subject === "computing") {
    return "coding";
  }

  const reasoningSubjects = ["math", "physics", "chemistry", "biology", "engineering"];
  if (subject && reasoningSubjects.includes(subject)) {
    return "reasoning";
  }

  // 2. Simple keyword detection - let the AI model do the heavy lifting
  const userMessages = messages
    .filter(m => m.role === "user")
    .map(m => m.content.toLowerCase())
    .join(" ");

  const codingMatches = CODING_KEYWORDS.filter(keyword => userMessages.includes(keyword)).length;
  const reasoningMatches = REASONING_KEYWORDS.filter(keyword => userMessages.includes(keyword)).length;

  // Use reasoning model for math/science, coding model for programming
  if (reasoningMatches >= 1 && reasoningMatches >= codingMatches) {
    return "reasoning";
  }
  
  if (codingMatches >= 1) {
    return "coding";
  }

  return "default";
};

// ============================================================================
// MODEL SELECTION
// ============================================================================

const getModelsForTaskType = (taskType: TaskType, userModel?: string | null): string[] => {
  // If user has explicitly selected a model, use only that model
  if (userModel && userModel !== "auto") {
    return [userModel];
  }

  // Auto-selection: pick models based on task type
  switch (taskType) {
    case "coding":
      return [DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL];
    case "reasoning":
      return [DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL];
    case "lightweight":
      return [LIGHTWEIGHT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL];
    case "highToken":
      return [HIGH_TOKEN_MODEL, DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL];
    case "compound":
      return [COMPOUND_MODEL, DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL];
    case "compoundMini":
      return [COMPOUND_MINI_MODEL, DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL];
    case "default":
    default:
      return [DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL];
  }
};

// DeepSeek-R1 works best with instructions in user messages, not system prompts.
// This merges any system message into the first user message.
const foldSystemIntoUser = (
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
) => {
  const systemMsg = messages.find(m => m.role === "system");
  if (!systemMsg) return messages;
  const rest = messages.filter(m => m.role !== "system");
  const firstUser = rest.find(m => m.role === "user");
  if (!firstUser) return rest;
  return rest.map(m =>
    m === firstUser
      ? { ...m, content: `${systemMsg.content}\n\n${m.content}` }
      : m
  );
};

// ============================================================================
// FAST PATH: For simple messages like greetings - no queue, lightweight model
// ============================================================================

const callFastChat = async (
  payload: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    max_tokens: number;
    temperature: number;
  }
): Promise<string> => {
  assertApiKeys();

  const model = LIGHTWEIGHT_MODEL;
  const keyIndex = getNextApiKeyIndex();
  const apiKey = getApiKeyAtIndex(keyIndex);

  if (!apiKey) {
    throw new Error("No API key available");
  }

  // Estimate token size - skip fast path if request is too large
  const messageText = payload.messages.map(m => m.content).join(" ");
  const estimatedTokens = Math.ceil(messageText.length / 3.5);
  const FAST_PATH_TOKEN_LIMIT = 5000; // Leave room for response tokens

  if (estimatedTokens > FAST_PATH_TOKEN_LIMIT) {
    console.log(`[Groq] FAST PATH skipped: request too large (${estimatedTokens} tokens)`);
    throw new Error("Request too large for fast path");
  }

  console.log(`[Groq] FAST PATH: ${model} with key #${keyIndex + 1}`);

  let controller: AbortController | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller?.abort(), 8000); // 8s timeout for fast path

    // Apply safe max tokens limit for lightweight model
    const safeMaxTokens = getSafeMaxTokens(model, payload.max_tokens);

    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: payload.messages,
        max_tokens: Math.min(safeMaxTokens, 200), // Keep greeting replies short & fast
        temperature: payload.temperature,
      }),
      signal: controller.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const errorMessage = await parseErrorMessage(response);
      // If fast path fails, still return an error - don't fall back to slow path
      throw new Error(`Fast path failed: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";

  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    throw error;
  }
};

// ============================================================================
// MAIN API CALL
// ============================================================================

export const callGroqChat = async (
  payload: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    max_tokens: number;
    temperature: number;
  },
  taskType: TaskType = "default",
  userSelectedModel?: string | null
) => {
  assertApiKeys();

  // FAST PATH: Simple messages like "hi" skip the queue and use lightweight model only
  if (isSimpleMessage(payload.messages)) {
    try {
      return await callFastChat(payload);
    } catch (error) {
      // Fast path failed (e.g., request too large), fall through to normal path
      console.log("[Groq] Fast path failed, using normal path");
    }
  }

  const taskModels = getModelsForTaskType(taskType, userSelectedModel);
  const modelsToTry = [...new Set([...taskModels, DEFAULT_MODEL])];

  // Estimate tokens in the request (~3.5 chars per token for English, more conservative for system prompts)
  const messageText = payload.messages.map(m => m.content).join(" ");
  const estimatedTokens = Math.ceil(messageText.length / 3.5) + payload.max_tokens;

  console.log(`[Groq] Task: "${taskType}" → Models: ${modelsToTry.join(" → ")} | API Keys: ${apiKeys.length} | Est. tokens: ${estimatedTokens}`);

  let lastError: unknown = null;
  const startingKeyIndex = getNextApiKeyIndex();

  // Wait in queue to prevent overwhelming the API
  await enqueueRequest();

  // Try each model with each API key
  for (const model of modelsToTry) {
    for (let keyOffset = 0; keyOffset < apiKeys.length; keyOffset++) {
      const keyIndex = (startingKeyIndex + keyOffset) % apiKeys.length;
      const apiKey = getApiKeyAtIndex(keyIndex);

      if (!apiKey) continue;

      await waitForToken(keyIndex, estimatedTokens);

      let controller: AbortController | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      try {
        console.log(`[Groq] Trying: ${model} with key #${keyIndex + 1}`);

        // Set up timeout for the request (120 seconds)
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          console.warn(`[Groq] Request timeout for ${model} after 120s`);
          controller!.abort();
        }, 120000);

        // Apply safe max tokens limit for this specific model
        const safeMaxTokens = getSafeMaxTokens(model, payload.max_tokens);

        const response = await fetch(GROQ_CHAT_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: payload.messages,
            max_tokens: safeMaxTokens,
            temperature: payload.temperature,
          }),
          signal: controller.signal,
        });

        // Clear timeout and release slot
        if (timeoutId) clearTimeout(timeoutId);
        releaseRequest(keyIndex);

        if (!response.ok) {
          const errorMessage = await parseErrorMessage(response);
          const statusCode = response.status;

          // On 429 (rate limit) — detect TPD vs per-minute limits
          if (statusCode === 429) {
            const isDaily = errorMessage.includes("per day") || errorMessage.includes("tokens per day") || errorMessage.includes("TPD");
            if (isDaily) {
              // Daily limit hit — no other key can help, skip to next model entirely
              console.warn(`[Groq] ${model} daily token limit exhausted, skipping to next model...`);
              break;
            }
            // Per-minute limit — try next key
            console.warn(`[Groq] ${model} rate limited on key #${keyIndex + 1}, trying next key...`);
            await delay(1000);
            continue;
          }

          // On 413 (request too large), this model won't work - try next model
          if (statusCode === 413) {
            console.warn(`[Groq] ${model} request too large on key #${keyIndex + 1}, trying next model...`);
            break; // Try next model (not just next key)
          }

          // On 401/403, API key is invalid - don't retry with this key
          if (statusCode === 401 || statusCode === 403) {
            console.error(`[Groq] ${model} authentication failed on key #${keyIndex + 1} - check API key`);
            continue; // Try next key
          }

          // On 5xx errors, Groq has an issue - try next key
          if (statusCode >= 500 && statusCode < 600) {
            console.warn(`[Groq] ${model} server error (${statusCode}) on key #${keyIndex + 1}, trying next key...`);
            await delay(500);
            continue;
          }

          throw new Error(`Groq API Error: ${statusCode} - ${errorMessage}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        console.log(`[Groq] ${model} ✅ success with key #${keyIndex + 1}`);
        return content;

      } catch (error) {
        // Clean up timeout
        if (timeoutId) clearTimeout(timeoutId);
        releaseRequest(keyIndex);

        lastError = error;

        // Handle abort/timeout errors
        if (error instanceof Error && error.name === "AbortError") {
          console.warn(`[Groq] Request timeout for model ${model}`);
          continue;
        }

        const message = formatError(error);
        const statusMatch = message.match(/Groq API Error: (\d+)/);
        const statusCode = statusMatch ? statusMatch[1] : "ERR";
        console.warn(`[Groq] ${model} ❌ key #${keyIndex + 1} failed (${statusCode})`);
        // Continue to next API key
      }
    }
    // All keys exhausted for this model, try next model
  }

  throw lastError instanceof Error ? lastError : new Error("AI request failed after trying all models and API keys");
};

// ============================================================================
// MAIN API CALL - STREAMING VERSION
// ============================================================================

export const callGroqChatStream = async (
  payload: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    max_tokens: number;
    temperature: number;
  },
  taskType: TaskType = "default",
  userSelectedModel?: string | null
) => {
  assertApiKeys();

  const taskModels = getModelsForTaskType(taskType, userSelectedModel);
  const modelsToTry = [...new Set([...taskModels, DEFAULT_MODEL])];

  // Estimate tokens in the request (~3.5 chars per token for English, more conservative for system prompts)
  const messageText = payload.messages.map(m => m.content).join(" ");
  const estimatedTokens = Math.ceil(messageText.length / 3.5) + payload.max_tokens;

  console.log(`[Groq] Task: "${taskType}" → Models: ${modelsToTry.join(" → ")} | API Keys: ${apiKeys.length} | Est. tokens: ${estimatedTokens}`);

  let lastError: unknown = null;
  const startingKeyIndex = getNextApiKeyIndex();

  // Wait in queue to prevent overwhelming the API
  await enqueueRequest();

  // Try each model with each API key
  for (const model of modelsToTry) {
    for (let keyOffset = 0; keyOffset < apiKeys.length; keyOffset++) {
      const keyIndex = (startingKeyIndex + keyOffset) % apiKeys.length;
      const apiKey = getApiKeyAtIndex(keyIndex);

      if (!apiKey) continue;

      await waitForToken(keyIndex, estimatedTokens);

      let controller: AbortController | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      try {
        console.log(`[Groq] Trying: ${model} with key #${keyIndex + 1} (streaming)`);

        // Set up timeout for the request (90 seconds for streaming)
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          console.warn(`[Groq] Streaming request timeout for ${model} after 90s`);
          controller!.abort();
        }, 90000);

        // Apply safe max tokens limit for this specific model
        const safeMaxTokens = getSafeMaxTokens(model, payload.max_tokens);

        const response = await fetch(GROQ_CHAT_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            stream: true,
            messages: payload.messages,
            max_tokens: safeMaxTokens,
            temperature: payload.temperature,
          }),
          signal: controller.signal,
        });

        // Clear timeout and release slot
        if (timeoutId) clearTimeout(timeoutId);
        releaseRequest(keyIndex);

        if (!response.ok) {
          const errorMessage = await parseErrorMessage(response);
          const statusCode = response.status;

          // On 429 (rate limit) — detect TPD vs per-minute limits
          if (statusCode === 429) {
            const isDaily = errorMessage.includes("per day") || errorMessage.includes("tokens per day") || errorMessage.includes("TPD");
            if (isDaily) {
              console.warn(`[Groq] ${model} daily token limit exhausted, skipping to next model...`);
              break;
            }
            console.warn(`[Groq] ${model} rate limited on key #${keyIndex + 1}, trying next key...`);
            await delay(1000);
            continue;
          }

          // On 413 (request too large), this model won't work - try next model
          if (statusCode === 413) {
            console.warn(`[Groq] ${model} request too large on key #${keyIndex + 1}, trying next model...`);
            break;
          }

          // On 401/403, API key is invalid
          if (statusCode === 401 || statusCode === 403) {
            console.error(`[Groq] ${model} authentication failed on key #${keyIndex + 1} - check API key`);
            continue;
          }

          // On 5xx errors, Groq has an issue - try next key
          if (statusCode >= 500 && statusCode < 600) {
            console.warn(`[Groq] ${model} server error (${statusCode}) on key #${keyIndex + 1}, trying next key...`);
            await delay(500);
            continue;
          }

          throw new Error(`Groq API Error: ${statusCode} - ${errorMessage}`);
        }

        console.log(`[Groq] ${model} ✅ streaming success with key #${keyIndex + 1}`);
        if (!response.body) {
          throw new Error("Empty response body from Groq API");
        }
        return response.body;

      } catch (error) {
        // Clean up timeout
        if (timeoutId) clearTimeout(timeoutId);
        releaseRequest(keyIndex);

        lastError = error;

        // Handle abort/timeout errors
        if (error instanceof Error && error.name === "AbortError") {
          console.warn(`[Groq] Streaming request timeout for model ${model}`);
          continue;
        }

        const message = formatError(error);
        const statusMatch = message.match(/Groq API Error: (\d+)/);
        const statusCode = statusMatch ? statusMatch[1] : "ERR";
        console.warn(`[Groq] ${model} ❌ key #${keyIndex + 1} failed (${statusCode})`);
        // Continue to next API key
      }
    }
    // All keys exhausted for this model, try next model
  }

  throw lastError instanceof Error ? lastError : new Error("AI request failed after trying all models and API keys");
};

// Backward compatibility aliases
export const callHfChat = callGroqChat;
export const callHfChatStream = callGroqChatStream;

// ============================================================================
// CONFIGURATION: Where we send AI requests and which models to use
// ============================================================================
const GROQ_CHAT_URL = process.env.GROQ_CHAT_URL || "https://api.groq.com/openai/v1/chat/completions";
const normalizeModelId = (modelId: string): string => {
    const modelMap = {
        "llama-3.1-8b": "openai/gpt-oss-20b",
        "llama-3.1-70b": "openai/gpt-oss-120b",
        "llama-3.3-70b": "openai/gpt-oss-120b",
        "llama3-8b": "openai/gpt-oss-20b",
        "llama3-70b": "openai/gpt-oss-120b",
        "llama-4-scout": "qwen/qwen3.6-27b",
        "qwen-3-32b": "qwen/qwen3.6-27b",
        "qwen-3.6-27b": "qwen/qwen3.6-27b",
    };
    if (modelId.includes("/")) {
        return modelId;
    }
    return (modelMap as Record<string, string>)[modelId] || modelId;
};
// Groq model lineup - using verified working model IDs from Groq API
// Last verified: May 2025
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_FALLBACK_MODEL = "openai/gpt-oss-20b";
const HIGH_THROUGHPUT_MODEL = "qwen/qwen3.6-27b";
const LIGHTWEIGHT_MODEL = "openai/gpt-oss-20b";
const REASONING_MODEL = "qwen/qwen3.6-27b";
const CODING_MODEL = "openai/gpt-oss-120b";
const LAST_RESORT_MODEL = "openai/gpt-oss-20b";
// User-selected model (from client) - if provided, use this instead of auto-selection
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
export const getUserSelectedModel = () => {
    return userSelectedModel;
};
// Resolve a user-facing model id (e.g. "llama-4-scout") to the real Groq model
// string. Falls back to the default model for "auto"/unknown values.
export const resolveModelForUser = (modelId?: string | null): string => {
    if (!modelId || modelId === "auto")
        return DEFAULT_MODEL;
    return normalizeModelId(modelId);
};
// Model-specific token limits - capped to stay under Groq's rate limits
// Qwen3-32B supports longer outputs for math/science reasoning
const MODEL_OUTPUT_LIMITS = {
    "openai/gpt-oss-20b": 4096,
    "openai/gpt-oss-120b": 4096,
    "qwen/qwen3.6-27b": 8192,
};
const MODEL_CONTEXT_LIMITS = {
    "openai/gpt-oss-20b": 131072,
    "openai/gpt-oss-120b": 131072,
    "qwen/qwen3.6-27b": 131072,
};
// Conservative per-request caps based on Groq free-tier limits
// Qwen gets a higher budget for detailed math/science reasoning
const MODEL_REQUEST_TOKEN_BUDGETS = {
    "openai/gpt-oss-20b": 16000,
    "openai/gpt-oss-120b": 16000,
    "qwen/qwen3.6-27b": 20000,
};
const MIN_COMPLETION_TOKENS = 256;
const getSafeMaxTokens = (model: string, requested: number, estimatedInputTokens = 0): number => {
    const limit = (MODEL_OUTPUT_LIMITS as Record<string, number>)[model] || 4096;
    const requestBudget = (MODEL_REQUEST_TOKEN_BUDGETS as Record<string, number>)[model];
    const maxByRequestBudget = requestBudget
        ? Math.max(MIN_COMPLETION_TOKENS, requestBudget - estimatedInputTokens)
        : requested;
    return Math.min(requested, limit, maxByRequestBudget);
};
// ============================================================================
// SMART QUESTION DETECTION: How we figure out what type of question it is
// ============================================================================
// Simple greetings/small talk that should use fast path
const SIMPLE_MESSAGES = [
    "hi", "hello", "hey", "greetings", "g'day", "hiya", "heya",
    "good morning", "good afternoon", "good evening",
    "how are you", "what's up", "how's it going", "how do you do",
    "yo", "sup", "what's happening", "nice to meet you",
    "thanks", "thank you", "cheers", "appreciate it",
    "bye", "goodbye", "see you", "catch you later", "talk soon",
    "ok", "okay", "sure", "yes", "no", "maybe", "alright",
    "please", "help", "quick question", "one thing"
];
const isSimpleMessage = (messages: { role: string; content: string }[]) => {
    // Check if there's only one short user message
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length !== 1)
        return false;
    const content = userMessages[0].content.toLowerCase().trim();
    if (content.length > 50)
        return false;
    return SIMPLE_MESSAGES.some(simple => content.includes(simple));
};
// ============================================================================
// API KEY MANAGEMENT
// ============================================================================
const apiKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
].filter((key) => Boolean(key));
// Keys that recently failed authentication are skipped for a cooldown window
// instead of burning a failed round-trip on every subsequent request.
const DEAD_KEY_COOLDOWN_MS = 5 * 60 * 1000;
const deadKeysUntil = new Map<number, number>();
const isKeyDead = (keyIndex: number): boolean => {
    const deadUntil = deadKeysUntil.get(keyIndex);
    if (!deadUntil)
        return false;
    if (Date.now() >= deadUntil) {
        deadKeysUntil.delete(keyIndex);
        return false;
    }
    return true;
};
const markKeyDead = (keyIndex: number) => {
    deadKeysUntil.set(keyIndex, Date.now() + DEAD_KEY_COOLDOWN_MS);
    console.error(`[Groq] Marking key #${keyIndex + 1} as dead for ${DEAD_KEY_COOLDOWN_MS / 60000}min (auth failure)`);
};
// Simple round-robin: get next live key index, wrapping around
const getNextApiKeyIndex = (() => {
    let index = 0;
    return () => {
        if (apiKeys.length === 0)
            return 0;
        for (let attempt = 0; attempt < apiKeys.length; attempt++) {
            const currentIndex = index % apiKeys.length;
            index = (index + 1) % apiKeys.length;
            if (!isKeyDead(currentIndex))
                return currentIndex;
        }
        // All keys are dead right now - fall back to the first one anyway
        return 0;
    };
})();
const getApiKeyAtIndex = (index: number) => {
    if (apiKeys.length === 0 || index < 0 || index >= apiKeys.length)
        return null;
    return apiKeys[index];
};
// ============================================================================
// RATE LIMITER: Token bucket to prevent API overload
// ============================================================================
// Groq free tier limits (adjust if you have different limits)
// Set from observed throughput: consecutive ~5-7k token streaming requests
// succeed back-to-back, so a conservative 18k TPM per key avoids artificial
// 10s stalls while still leaving headroom under Groq's real per-minute cap.
const RATE_LIMIT_CONFIG = {
    rpmPerKey: 6,
    tpmPerKey: 18000,
    minDelayMs: 200,
    maxConcurrentPerKey: 2,
};
const keyBuckets = new Map();
const getOrCreateBucket = (keyIndex: number) => {
    if (!keyBuckets.has(keyIndex)) {
        keyBuckets.set(keyIndex, {
            tokens: RATE_LIMIT_CONFIG.tpmPerKey,
            lastRefill: Date.now(),
            concurrentRequests: 0,
        });
    }
    return keyBuckets.get(keyIndex);
};
const refillTokens = (bucket: any) => {
    const now = Date.now();
    const elapsedMs = now - bucket.lastRefill;
    const tokensPerMs = RATE_LIMIT_CONFIG.tpmPerKey / 60000;
    bucket.tokens = Math.min(RATE_LIMIT_CONFIG.tpmPerKey, bucket.tokens + elapsedMs * tokensPerMs);
    bucket.lastRefill = now;
};
// A short cap so the bucket can smooth bursts without stalling replies.
// Once Groq's real per-minute limit is hit, the 429 retry/backoff path below
// takes over and uses the server's retry-after window instead of our estimate.
const MAX_TOKEN_WAIT_MS = 2000;
const waitForToken = async (keyIndex: number, requiredTokens: number) => {
    const bucket = getOrCreateBucket(keyIndex);
    // Block until tokens are available
    const tokensPerMs = RATE_LIMIT_CONFIG.tpmPerKey / 60000;
    const startedAt = Date.now();
    while (true) {
        refillTokens(bucket);
        const effectiveRequired = Math.min(requiredTokens, RATE_LIMIT_CONFIG.tpmPerKey * 0.85);
        if (bucket.tokens >= effectiveRequired) {
            bucket.tokens -= effectiveRequired;
            break;
        }
        // Give up waiting after a hard cap so requests never hang for a minute+
        // (the client aborts at 60s, and a large request can otherwise stall here
        // for 50s+. Groq's own 429 handling + backoff take over if we're limited.)
        if (Date.now() - startedAt >= MAX_TOKEN_WAIT_MS) {
            console.warn(`[Groq] Token bucket wait exceeded ${MAX_TOKEN_WAIT_MS}ms (need ${Math.ceil(effectiveRequired)}t, have ${Math.ceil(bucket.tokens)}t) - proceeding without reserving tokens`);
            break;
        }
        // Wait for enough tokens to accumulate
        const deficit = effectiveRequired - bucket.tokens;
        const waitMs = Math.ceil(deficit / tokensPerMs) + 50;
        await delay(Math.min(waitMs, 2000));
    }
    bucket.concurrentRequests++;
    return true;
};
const releaseRequest = (keyIndex: number) => {
    const bucket = getOrCreateBucket(keyIndex);
    bucket.concurrentRequests = Math.max(0, bucket.concurrentRequests - 1);
};
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const exponentialBackoff = async (attempt: number, baseMs = 500) => {
    const waitTime = baseMs * Math.pow(2, attempt);
    const jitter = Math.random() * 200;
    console.log(`[Groq] Rate limited, backing off ${waitTime + jitter | 0}ms...`);
    await delay(waitTime + jitter);
};
// Global request queue to serialize requests when rate limited
const enqueueRequest = () => {
    // Don't queue at all - let requests run concurrently.
    // The token bucket and Groq's own 429s handle actual overload.
    // The old serialisation was the primary cause of "can't reach AI service"
    // on second messages (message 2 would queue behind message 1's stream).
    return Promise.resolve();
};
// ============================================================================
// ERROR HANDLING
// ============================================================================
const TOKEN_LIMIT_HINT = "Request too large - this request exceeds the AI provider's per-minute token limit. Try shortening your question, attaching fewer files, or starting a new chat.";
const parseErrorMessage = async (response: Response) => {
    try {
        const raw = await response.text();
        if (!raw)
            return response.statusText || `HTTP ${response.status}`;
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === "string")
                return parsed;
            if (parsed?.error) {
                if (typeof parsed.error === "string") {
                    // Enhance token limit error messages with explanation
                    if (response.status !== 429 && (parsed.error.toLowerCase().includes("token") || parsed.error.toLowerCase().includes("length"))) {
                        return TOKEN_LIMIT_HINT;
                    }
                    return parsed.error;
                }
                if (typeof parsed.error === "object" && parsed.error.message) {
                    // Enhance token limit error messages with explanation
                    const msg = parsed.error.message.toLowerCase();
                    if (response.status !== 429 && (msg.includes("token") || msg.includes("length") || msg.includes("maximum"))) {
                        return TOKEN_LIMIT_HINT;
                    }
                    return parsed.error.message;
                }
                return JSON.stringify(parsed.error);
            }
            if (parsed?.message)
                return parsed.message;
            return JSON.stringify(parsed);
        }
        catch {
            return raw.slice(0, 500); // Return first 500 chars of raw response
        }
    }
    catch (e) {
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
export const formatError = (error: any) => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    if (error && typeof error === "object" && "message" in error) {
        return String(error.message);
    }
    return "Unknown error occurred";
};
// ============================================================================
// QUESTION CLASSIFIER
// ============================================================================
export const classifyTaskType = (messages: { role: string; content: string }[], subject?: string) => {
    // 1. Explicit subject-based overrides (Highest priority)
    if (subject === "computing") {
        return "coding";
    }
    const reasoningSubjects = ["math", "physics", "chemistry", "biology", "engineering"];
    if (subject && reasoningSubjects.includes(subject)) {
        return "reasoning";
    }
    // 2. Quick lightweight detection for obvious simple messages
    const userMessages = messages
        .filter(m => m.role === "user")
        .map(m => m.content);
    const latestMessage = userMessages[userMessages.length - 1] || "";
    // Check for obvious code blocks
    if (/```[\s\S]*```/.test(latestMessage) || /^\s*```/.test(latestMessage)) {
        return "coding";
    }
    // Check for code snippets with technical syntax
    if (/\b(function|class|interface|const|let|var|import|export|return|async|await)\b/.test(latestMessage)) {
        return "coding";
    }
    // Check for obvious math/science notation
    if (/\$[^$]+\$|\\\(|\\\[|\\\d+|sin|cos|tan|∫|∑|√|π|θ|φ|λ|Δ|∂|∇/.test(latestMessage)) {
        return "reasoning";
    }
    // Check for obvious short conversational messages
    if (latestMessage.length < 50 && isSimpleMessage(messages)) {
        return "lightweight";
    }
    // 3. For ambiguous cases, fall back to default lightweight behavior.
    // (We previously attempted to call an external classifier here, but
    // synchronous callers expect a direct TaskType. Keep the runtime
    // deterministic and return 'default'.)
    return "default";
};
// ============================================================================
// MODEL SELECTION
// ============================================================================
// Models that are unavailable or should not be used
const BLOCKED_MODELS = ["gemma2-9b", "gemma-2-9b-it", "gemma2-9b-it"];
const filterBlockedModels = (models: string[]) => {
    return models
        .map(m => normalizeModelId(m)) // Normalize each model ID
        .filter(m => !BLOCKED_MODELS.includes(m.toLowerCase()));
};
class GroqUpstreamError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
        super(message);
        this.name = "GroqUpstreamError";
        this.statusCode = statusCode;
    }
}
const getRetryAfterMs = (response: Response) => {
    const retryAfter = response.headers.get("retry-after");
    if (!retryAfter)
        return 0;
    const seconds = Number.parseFloat(retryAfter);
    if (Number.isFinite(seconds)) {
        return Math.min(seconds * 1000, 8000);
    }
    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
        return Math.min(Math.max(0, retryAt - Date.now()), 8000);
    }
    return 0;
};
const getModelsForTaskType = (taskType: string, userModel?: string, estimatedTokens?: number) => {
    // If user has explicitly selected a model, use only that model (if not blocked)
    if (userModel && userModel !== "auto") {
        const normalizedModel = normalizeModelId(userModel);
        if (BLOCKED_MODELS.includes(normalizedModel.toLowerCase())) {
            console.warn(`[Groq] Blocked model requested: ${normalizedModel}, falling back to auto`);
        }
        else {
            return [normalizedModel];
        }
    }
    // Dynamic model selection based on context size
    // Large context = use models with larger context windows
    const defaultTokenBudget = MODEL_REQUEST_TOKEN_BUDGETS[DEFAULT_MODEL] || 12000;
    if (estimatedTokens && estimatedTokens > defaultTokenBudget) {
        console.log(`[Groq] Large request detected (${estimatedTokens} tokens), prioritizing high-throughput models`);
        return filterBlockedModels([HIGH_THROUGHPUT_MODEL, DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL]);
    }
    const CONTEXT_LIMIT = 8192;
    if (estimatedTokens && estimatedTokens > CONTEXT_LIMIT * 0.7) {
        console.log(`[Groq] Large context detected (${estimatedTokens} tokens), avoiding lightweight-only routing`);
        return filterBlockedModels([DEFAULT_MODEL, HIGH_THROUGHPUT_MODEL, DEFAULT_FALLBACK_MODEL]);
    }
    // Auto-selection: pick models based on task type
    let models;
    switch (taskType) {
        case "coding":
            // Use 70B for coding, fallback to 8B if rate limited
            models = [CODING_MODEL, HIGH_THROUGHPUT_MODEL, DEFAULT_FALLBACK_MODEL];
            break;
        case "reasoning":
            // Use Qwen3 for math/science reasoning, fallback to 70B then 8B
            models = [REASONING_MODEL, DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL];
            break;
        case "lightweight":
            // Fast 8B model for simple queries
            models = [LIGHTWEIGHT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL];
            break;
        case "default":
        default:
            // General purpose: 70B first, then fallbacks
            models = [DEFAULT_MODEL, HIGH_THROUGHPUT_MODEL, DEFAULT_FALLBACK_MODEL];
    }
    return filterBlockedModels(models);
};
// DeepSeek-R1 works best with instructions in user messages, not system prompts.
// This merges any system message into the first user message.
// ============================================================================
// FAST PATH: For simple messages like greetings - no queue, lightweight model
// ============================================================================
const callFastChat = async (payload: any, userModel?: any) => {
    assertApiKeys();
    // Honour an explicit user-selected model on the fast path too - only fall
    // back to the lightweight model when the user hasn't picked one.
    const availableModels = userModel && userModel !== "auto"
        ? filterBlockedModels([normalizeModelId(userModel), LIGHTWEIGHT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL])
        : filterBlockedModels([LIGHTWEIGHT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL]);
    const model = availableModels[0] || LAST_RESORT_MODEL;
    const keyIndex = getNextApiKeyIndex();
    const apiKey = getApiKeyAtIndex(keyIndex);
    if (!apiKey) {
        throw new Error("No API key available");
    }
    // Estimate token size - skip fast path if request is too large
    const messageText = payload.messages.map((m: any) => m.content).join(" ");
    const estimatedTokens = Math.ceil(messageText.length / 3.5);
    const FAST_PATH_TOKEN_LIMIT = 5000; // Leave room for response tokens
    if (estimatedTokens > FAST_PATH_TOKEN_LIMIT) {
        console.log(`[Groq] FAST PATH skipped: request too large (${estimatedTokens} tokens)`);
        throw new Error("Request too large for fast path");
    }
    console.log(`[Groq] FAST PATH: ${model} with key #${keyIndex + 1}`);
    let controller: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller?.abort(), 8000); // 8s timeout for fast path
        // Apply safe max tokens limit for lightweight model
        const safeMaxTokens = getSafeMaxTokens(model, payload.max_tokens, estimatedTokens);
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
        if (timeoutId)
            clearTimeout(timeoutId);
        if (!response.ok) {
            const errorMessage = await parseErrorMessage(response);
            // If fast path fails, still return an error - don't fall back to slow path
            throw new Error(`Fast path failed: ${response.status} - ${errorMessage}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    }
    catch (error) {
        if (timeoutId)
            clearTimeout(timeoutId);
        throw error;
    }
};
// ============================================================================
// MAIN API CALL
// ============================================================================
export const callGroqChat = async (payload: any, taskType = "default", userSelectedModel?: any) => {
    assertApiKeys();
    // FAST PATH: Simple messages like "hi" skip the queue and use lightweight model only
    if (isSimpleMessage(payload.messages)) {
        try {
            return await callFastChat(payload, userSelectedModel);
        }
        catch {
            // Fast path failed (e.g., request too large), fall through to normal path
            console.log("[Groq] Fast path failed, using normal path");
        }
    }
    // Estimate tokens BEFORE model selection
    const messageText = payload.messages.map((m: any) => m.content).join(" ");
    const estimatedInputTokens = Math.ceil(messageText.length / 3.5);
    const estimatedTokens = estimatedInputTokens + payload.max_tokens;
    const taskModels = getModelsForTaskType(taskType, userSelectedModel, estimatedTokens);
    const modelsToTry = [...new Set([...taskModels, DEFAULT_MODEL])];
    console.log(`[Groq] Task: "${taskType}" → Models: ${modelsToTry.join(" → ")} | API Keys: ${apiKeys.length} | Est. tokens: ${estimatedTokens}`);
    let lastError: Error | null = null;
    const startingKeyIndex = getNextApiKeyIndex();
    // Wait in queue to prevent overwhelming the API
    await enqueueRequest();
    const MAX_RETRY_ROUNDS_PER_MODEL = 2;
    // Try each model with each API key. Retry transient 429s after the advertised
    // wait, otherwise a short retry-after just burns time and the model is never
    // attempted again.
    for (const model of modelsToTry) {
        const contextLimit = (MODEL_CONTEXT_LIMITS as Record<string, number>)[model] || 8192;
        if (estimatedInputTokens + MIN_COMPLETION_TOKENS > contextLimit) {
            lastError = new GroqUpstreamError(413, `Groq API Error: 413 - Request too large for ${model}`);
            console.warn(`[Groq] ${model} skipped: prompt exceeds context window`);
            continue;
        }
        let tryNextModel = false;
        for (let retryRound = 0; retryRound < MAX_RETRY_ROUNDS_PER_MODEL && !tryNextModel; retryRound++) {
            for (let keyOffset = 0; keyOffset < apiKeys.length; keyOffset++) {
                const keyIndex = (startingKeyIndex + keyOffset) % apiKeys.length;
                if (isKeyDead(keyIndex)) {
                    console.log(`[Groq] Skipping dead key #${keyIndex + 1}`);
                    continue;
                }
                const apiKey = getApiKeyAtIndex(keyIndex);
                if (!apiKey)
                    continue;
                // Apply safe max tokens limit for this specific model and current prompt.
                const safeMaxTokens = getSafeMaxTokens(model, payload.max_tokens, estimatedInputTokens);
                const requestTokens = estimatedInputTokens + safeMaxTokens;
                await waitForToken(keyIndex, requestTokens);
                let controller: AbortController | null = null;
                let timeoutId: ReturnType<typeof setTimeout> | null = null;
                try {
                    console.log(`[Groq] Trying: ${model} with key #${keyIndex + 1}${retryRound > 0 ? ` (retry ${retryRound + 1})` : ""}`);
                    // Set up timeout for the request (120 seconds)
                    controller = new AbortController();
                    timeoutId = setTimeout(() => {
                        console.warn(`[Groq] Request timeout for ${model} after 120s`);
                        controller!.abort();
                    }, 120000);
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
                    if (timeoutId)
                        clearTimeout(timeoutId);
                    releaseRequest(keyIndex);
                    if (!response.ok) {
                        const errorMessage = await parseErrorMessage(response);
                        const statusCode = response.status;
                        // On 429 (rate limit) - detect TPD vs per-minute limits
                        if (statusCode === 429) {
                            lastError = new GroqUpstreamError(429, `Groq API Error: 429 - ${errorMessage}`);
                            const isDaily = errorMessage.includes("per day") || errorMessage.includes("tokens per day") || errorMessage.includes("TPD");
                            if (isDaily) {
                                // Daily limit hit - no other key can help, skip to next model entirely
                                console.warn(`[Groq] ${model} daily token limit exhausted, skipping to next model...`);
                                tryNextModel = true;
                                break;
                            }
                            const waitMs = getRetryAfterMs(response);
                            if (waitMs > 0) {
                                console.log(`[Groq] Rate limited, waiting ${waitMs}ms...`);
                                await delay(waitMs);
                            }
                            else {
                                await exponentialBackoff(keyOffset + retryRound);
                            }
                            continue;
                        }
                        // On 413 (request too large), this model won't work - try next model
                        if (statusCode === 413) {
                            lastError = new GroqUpstreamError(413, `Groq API Error: 413 - ${errorMessage}`);
                            console.warn(`[Groq] ${model} request too large on key #${keyIndex + 1}, trying next model...`);
                            tryNextModel = true;
                            break; // Try next model (not just next key)
                        }
                        // On 401/403, API key is invalid - don't retry with this key
                        if (statusCode === 401 || statusCode === 403) {
                            lastError = new GroqUpstreamError(503, `Groq API Error: ${statusCode} - ${errorMessage}`);
                            console.error(`[Groq] ${model} authentication failed on key #${keyIndex + 1} - check API key`);
                            markKeyDead(keyIndex);
                            continue; // Try next key
                        }
                        // On 5xx errors, Groq has an issue - try next key
                        if (statusCode >= 500 && statusCode < 600) {
                            lastError = new GroqUpstreamError(503, `Groq API Error: ${statusCode} - ${errorMessage}`);
                            console.warn(`[Groq] ${model} server error (${statusCode}) on key #${keyIndex + 1}, trying next key...`);
                            await delay(500);
                            continue;
                        }
                        throw new GroqUpstreamError(statusCode, `Groq API Error: ${statusCode} - ${errorMessage}`);
                    }
                    const data = await response.json();
                    const content = data.choices?.[0]?.message?.content || "";
                    console.log(`[Groq] ${model} ✅ success with key #${keyIndex + 1}`);
                    return content;
                }
                catch (error) {
                    // Clean up timeout
                    if (timeoutId)
                        clearTimeout(timeoutId);
                    releaseRequest(keyIndex);
                    lastError = error as Error;
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
        }
        // All keys exhausted for this model, try next model
    }
    throw lastError instanceof Error ? lastError : new GroqUpstreamError(503, "AI service failed after trying all models and API keys");
};
// ============================================================================
// MAIN API CALL - STREAMING VERSION
// ============================================================================
export const callGroqChatStream = async (payload: any, taskType = "default", userSelectedModel?: any) => {
    assertApiKeys();
    // Estimate tokens BEFORE model selection
    const messageText = payload.messages.map((m: any) => m.content).join(" ");
    const estimatedInputTokens = Math.ceil(messageText.length / 3.5);
    const estimatedTokens = estimatedInputTokens + payload.max_tokens;
    const taskModels = getModelsForTaskType(taskType, userSelectedModel, estimatedTokens);
    const modelsToTry = [...new Set([...taskModels, DEFAULT_MODEL])];
    console.log(`[Groq] Task: "${taskType}" → Models: ${modelsToTry.join(" → ")} | API Keys: ${apiKeys.length} | Est. tokens: ${estimatedTokens}`);
    let lastError: Error | null = null;
    const startingKeyIndex = getNextApiKeyIndex();
    // Wait in queue to prevent overwhelming the API
    await enqueueRequest();
    const MAX_RETRY_ROUNDS_PER_MODEL = 2;
    // Try each model with each API key. Retry transient 429s after waiting so
    // short Groq retry-after windows do not immediately fall through to 500s.
    for (const model of modelsToTry) {
        const contextLimit = (MODEL_CONTEXT_LIMITS as Record<string, number>)[model] || 8192;
        if (estimatedInputTokens + MIN_COMPLETION_TOKENS > contextLimit) {
            lastError = new GroqUpstreamError(413, `Groq API Error: 413 - Request too large for ${model}`);
            console.warn(`[Groq] ${model} skipped: prompt exceeds context window`);
            continue;
        }
        let tryNextModel = false;
        for (let retryRound = 0; retryRound < MAX_RETRY_ROUNDS_PER_MODEL && !tryNextModel; retryRound++) {
            for (let keyOffset = 0; keyOffset < apiKeys.length; keyOffset++) {
                const keyIndex = (startingKeyIndex + keyOffset) % apiKeys.length;
                if (isKeyDead(keyIndex)) {
                    console.log(`[Groq] Skipping dead key #${keyIndex + 1}`);
                    continue;
                }
                const apiKey = getApiKeyAtIndex(keyIndex);
                if (!apiKey)
                    continue;
                // Apply safe max tokens limit for this specific model and current prompt.
                const safeMaxTokens = getSafeMaxTokens(model, payload.max_tokens, estimatedInputTokens);
                const requestTokens = estimatedInputTokens + safeMaxTokens;
                await waitForToken(keyIndex, requestTokens);
                let controller: AbortController | null = null;
                let timeoutId: ReturnType<typeof setTimeout> | null = null;
                try {
                    console.log(`[Groq] Trying: ${model} with key #${keyIndex + 1} (streaming${retryRound > 0 ? ` retry ${retryRound + 1}` : ""})`);
                    // Set up timeout for the request (90 seconds for streaming)
                    controller = new AbortController();
                    timeoutId = setTimeout(() => {
                        console.warn(`[Groq] Streaming request timeout for ${model} after 90s`);
                        controller!.abort();
                    }, 90000);
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
                    if (timeoutId)
                        clearTimeout(timeoutId);
                    releaseRequest(keyIndex);
                    if (!response.ok) {
                        const errorMessage = await parseErrorMessage(response);
                        const statusCode = response.status;
                        // On 429 (rate limit) - detect TPD vs per-minute limits
                        if (statusCode === 429) {
                            lastError = new GroqUpstreamError(429, `Groq API Error: 429 - ${errorMessage}`);
                            const isDaily = errorMessage.includes("per day") || errorMessage.includes("tokens per day") || errorMessage.includes("TPD");
                            if (isDaily) {
                                console.warn(`[Groq] ${model} daily token limit exhausted, skipping to next model...`);
                                tryNextModel = true;
                                break;
                            }
                            const waitMs = getRetryAfterMs(response);
                            if (waitMs > 0) {
                                console.log(`[Groq] Rate limited, waiting ${waitMs}ms...`);
                                await delay(waitMs);
                            }
                            else {
                                await exponentialBackoff(keyOffset + retryRound);
                            }
                            continue;
                        }
                        // On 413 (request too large), this model won't work - try next model
                        if (statusCode === 413) {
                            lastError = new GroqUpstreamError(413, `Groq API Error: 413 - ${errorMessage}`);
                            console.warn(`[Groq] ${model} request too large on key #${keyIndex + 1}, trying next model...`);
                            tryNextModel = true;
                            break;
                        }
                        // On 401/403, API key is invalid
                        if (statusCode === 401 || statusCode === 403) {
                            lastError = new GroqUpstreamError(503, `Groq API Error: ${statusCode} - ${errorMessage}`);
                            console.error(`[Groq] ${model} authentication failed on key #${keyIndex + 1} - check API key`);
                            markKeyDead(keyIndex);
                            continue;
                        }
                        // On 5xx errors, Groq has an issue - try next key
                        if (statusCode >= 500 && statusCode < 600) {
                            lastError = new GroqUpstreamError(503, `Groq API Error: ${statusCode} - ${errorMessage}`);
                            console.warn(`[Groq] ${model} server error (${statusCode}) on key #${keyIndex + 1}, trying next key...`);
                            await delay(500);
                            continue;
                        }
                        throw new GroqUpstreamError(statusCode, `Groq API Error: ${statusCode} - ${errorMessage}`);
                    }
                    console.log(`[Groq] ${model} ✅ streaming success with key #${keyIndex + 1}`);
                    return response.body;
                }
                catch (error) {
                    // Clean up timeout
                    if (timeoutId)
                        clearTimeout(timeoutId);
                    releaseRequest(keyIndex);
                    lastError = error as Error;
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
        }
        // All keys exhausted for this model, try next model
    }
    throw lastError instanceof Error ? lastError : new GroqUpstreamError(503, "AI service failed after trying all models and API keys");
};
// Backward compatibility aliases
export const callHfChat = callGroqChat;
export const callHfChatStream = callGroqChatStream;
//# sourceMappingURL=_utils.js.map
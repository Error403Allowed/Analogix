// ============================================================================
// CONFIGURATION: Where we send AI requests and which models to use
// ============================================================================
const GROQ_CHAT_URL = process.env.GROQ_CHAT_URL || "https://api.groq.com/openai/v1/chat/completions";
// Model name normalization - fixes any short names to full model IDs
// Groq API requires exact model IDs like "llama-3.1-8b-instant", not "llama-3.1-8b"
const normalizeModelId = (modelId) => {
    const modelMap = {
        "llama-3.1-8b": "llama-3.1-8b-instant",
        "llama-3.1-70b": "llama-3.1-70b-versatile",
        "llama-3.3-70b": "llama-3.3-70b-versatile",
        "llama3-8b": "llama-3.1-8b-instant",
        "llama3-70b": "llama-3.3-70b-versatile",
        "llama-4-scout": "meta-llama/llama-4-scout-17b-16e-instruct",
        "qwen-3-32b": "qwen/qwen3-32b",
    };
    // If already a full model ID, return as-is
    if (modelId.includes("-instant") || modelId.includes("-versatile") || modelId.includes("meta-llama/")) {
        return modelId;
    }
    return modelMap[modelId] || modelId;
};
// Groq model lineup — using verified working model IDs from Groq API
// Last verified: May 2025
const DEFAULT_MODEL = "llama-3.3-70b-versatile"; // Llama 3.3 70B - best quality
const DEFAULT_FALLBACK_MODEL = "llama-3.1-8b-instant"; // Llama 3.1 8B - fast & cheap
const HIGH_THROUGHPUT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"; // Higher TPM fallback for larger prompts
const QWEN_MODEL = "qwen/qwen3-32b"; // Strong for math/science/coding
// Additional models for specific use cases
const LIGHTWEIGHT_MODEL = "llama-3.1-8b-instant"; // Fast, cheap
const REASONING_MODEL = "qwen/qwen3-32b"; // Qwen3 for math/science reasoning
const CODING_MODEL = "llama-3.3-70b-versatile"; // 70B for coding tasks
const LARGE_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"; // Large context tasks
const LAST_RESORT_MODEL = "llama-3.1-8b-instant"; // Fallback
// User-selected model (from client) — if provided, use this instead of auto-selection
let userSelectedModel = null;
/**
 * Set the user-selected model
 * @param model The model string to use (e.g., "llama-3.3-70b-versatile"), or null to use auto-selection
 */
export const setUserSelectedModel = (model) => {
    userSelectedModel = model;
};
/**
 * Get the user-selected model, or null if auto-selection is enabled
 */
export const getUserSelectedModel = () => {
    return userSelectedModel;
};
// Model-specific token limits - capped to stay under Groq's rate limits
// Qwen3-32B supports longer outputs for math/science reasoning
const MODEL_OUTPUT_LIMITS = {
    "llama-3.3-70b-versatile": 3000,
    "llama-3.1-70b-versatile": 3000,
    "llama-3.1-8b-instant": 3000,
    "meta-llama/llama-4-scout-17b-16e-instruct": 3000,
    "openai/gpt-oss-20b": 3000,
    "openai/gpt-oss-120b": 3000,
    "qwen/qwen3-32b": 4096,
};
const MODEL_CONTEXT_LIMITS = {
    "llama-3.3-70b-versatile": 131072,
    "llama-3.1-70b-versatile": 131072,
    "llama-3.1-8b-instant": 131072,
    "meta-llama/llama-4-scout-17b-16e-instruct": 131072,
    "openai/gpt-oss-20b": 131072,
    "openai/gpt-oss-120b": 131072,
    "qwen/qwen3-32b": 131072,
};
// Conservative per-request caps based on Groq free-tier ~6k TPM
// Qwen gets a higher budget for detailed math/science reasoning
const MODEL_REQUEST_TOKEN_BUDGETS = {
    "llama-3.3-70b-versatile": 12000,
    "llama-3.1-70b-versatile": 12000,
    "llama-3.1-8b-instant": 12000,
    "meta-llama/llama-4-scout-17b-16e-instruct": 12000,
    "openai/gpt-oss-20b": 12000,
    "openai/gpt-oss-120b": 12000,
    "qwen/qwen3-32b": 16000,
};
const MIN_COMPLETION_TOKENS = 256;
const getSafeMaxTokens = (model, requested, estimatedInputTokens = 0) => {
    const limit = MODEL_OUTPUT_LIMITS[model] || 4096;
    const requestBudget = MODEL_REQUEST_TOKEN_BUDGETS[model];
    const maxByRequestBudget = requestBudget
        ? Math.max(MIN_COMPLETION_TOKENS, requestBudget - estimatedInputTokens)
        : requested;
    return Math.min(requested, limit, maxByRequestBudget);
};
// ============================================================================
// SMART QUESTION DETECTION: How we figure out what type of question it is
// ============================================================================
// Words that indicate a CODING question
const CODING_KEYWORDS = [
    "code", "coding", "program", "programming", "function", "method", "class",
    "debug", "debugging", "algorithm", "script", "syntax", "compiler", "variable",
    "api", "endpoint", "database", "sql", "query", "javascript", "python", "java",
    "typescript", "react", "node", "html", "css", "git", "github", "array", "object",
    "loop", "json", "const", "let", "var", "npm", "component", "interface",
    "implement", "refactor", "deploy", "build", "compile", "runtime", "framework",
    "library", "package", "module", "export", "import", "async", "await", "promise",
    "callback", "middleware", "server", "client", "rest", "graphql", "docker",
    "kubernetes", "ci/cd", "pipeline", "test", "unit test", "integration test"
];
// Words that indicate a REASONING / MATH / SCIENCE question
const REASONING_KEYWORDS = [
    "solve", "calculate", "find", "prove", "derivative", "integral",
    "equation", "formula", "quadratic", "algebra", "geometry", "calculus",
    "physics", "chemistry", "biology", "science",
    "theorem", "hypothesis", "experiment", "analysis", "statistic", "probability",
    "matrix", "vector", "polynomial", "logarithm", "trigonometry", "differential",
    "molecular", "atomic", "reaction", "force", "velocity", "acceleration",
    "energy", "momentum", "entropy", "wavelength", "frequency", "circuit",
    "organic", "inorganic", "stoichiometry", "periodic", "isotope", "enzyme",
    "cell", "dna", "rna", "protein", "metabolism", "evolution", "genetics"
];
// Words that indicate a CREATIVE / WRITING task (benefits from larger models)
const CREATIVE_KEYWORDS = [
    "write", "essay", "story", "poem", "creative", "describe", "explain in detail",
    "compare", "contrast", "analyze", "discuss", "evaluate", "critique", "review",
    "summarize", "outline", "draft", "compose", "narrative", "argument", "thesis",
    "persuade", "opinion", "interpret", "meaning", "theme", "symbolism", "metaphor"
];
// Words that indicate a simple/conversational message (lightweight is fine)
const CONVERSATIONAL_KEYWORDS = [
    "thanks", "thank", "appreciate", "great", "awesome", "perfect", "nice",
    "cool", "ok", "okay", "sure", "got it", "understood", "makes sense",
    "interesting", "wow", "haha", "lol", "good", "bad", "right", "wrong"
];
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
const isSimpleMessage = (messages) => {
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
// Simple round-robin: get next key index, wrapping around
const getNextApiKeyIndex = (() => {
    let index = 0;
    return () => {
        if (apiKeys.length === 0)
            return 0;
        const currentIndex = index % apiKeys.length;
        index = (index + 1) % apiKeys.length;
        return currentIndex;
    };
})();
const getApiKeyAtIndex = (index) => {
    if (apiKeys.length === 0 || index < 0 || index >= apiKeys.length)
        return null;
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
const keyBuckets = new Map();
const getOrCreateBucket = (keyIndex) => {
    if (!keyBuckets.has(keyIndex)) {
        keyBuckets.set(keyIndex, {
            tokens: RATE_LIMIT_CONFIG.tpmPerKey,
            lastRefill: Date.now(),
            concurrentRequests: 0,
        });
    }
    return keyBuckets.get(keyIndex);
};
const refillTokens = (bucket) => {
    const now = Date.now();
    const elapsedMs = now - bucket.lastRefill;
    // Refill at per-key rate only (not multiplied by key count)
    const tokensPerMs = RATE_LIMIT_CONFIG.tpmPerKey / 60000;
    const newTokens = Math.min(RATE_LIMIT_CONFIG.tpmPerKey, bucket.tokens + elapsedMs * tokensPerMs);
    bucket.tokens = newTokens;
    bucket.lastRefill = now;
};
const waitForToken = async (keyIndex, requiredTokens) => {
    const bucket = getOrCreateBucket(keyIndex);
    refillTokens(bucket);
    // Never block on concurrent requests locally — Groq handles real overload via 429.
    // Just track it for observability.
    bucket.concurrentRequests++;
    // Deduct tokens if available; if not, let it through anyway (soft throttle only).
    const effectiveRequired = Math.min(requiredTokens, RATE_LIMIT_CONFIG.tpmPerKey * 0.9);
    if (bucket.tokens >= effectiveRequired) {
        bucket.tokens -= effectiveRequired;
    }
    else {
        // Bucket empty — let it through, Groq will 429 if truly overloaded
        bucket.tokens = 0;
    }
    return true;
};
const releaseRequest = (keyIndex) => {
    const bucket = getOrCreateBucket(keyIndex);
    bucket.concurrentRequests = Math.max(0, bucket.concurrentRequests - 1);
};
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const exponentialBackoff = async (attempt, baseMs = 500) => {
    const waitTime = baseMs * Math.pow(2, attempt);
    const jitter = Math.random() * 200;
    console.log(`[Groq] Rate limited, backing off ${waitTime + jitter | 0}ms...`);
    await delay(waitTime + jitter);
};
// Global request queue to serialize requests when rate limited
const requestQueue = [];
const isProcessingQueue = false;
const enqueueRequest = () => {
    // Don't queue at all — let requests run concurrently.
    // The token bucket and Groq's own 429s handle actual overload.
    // The old serialisation was the primary cause of "can't reach AI service"
    // on second messages (message 2 would queue behind message 1's stream).
    return Promise.resolve();
};
// ============================================================================
// ERROR HANDLING
// ============================================================================
const parseErrorMessage = async (response) => {
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
                        return "Response limit reached - I'm capped at ~1900 tokens per response due to API rate limits (Groq's free tier allows ~6000 tokens/minute). This keeps responses fast and reliable. For longer content, try breaking your question into parts or ask me to continue in a follow-up message.";
                    }
                    return parsed.error;
                }
                if (typeof parsed.error === "object" && parsed.error.message) {
                    // Enhance token limit error messages with explanation
                    const msg = parsed.error.message.toLowerCase();
                    if (response.status !== 429 && (msg.includes("token") || msg.includes("length") || msg.includes("maximum"))) {
                        return "Response limit reached - I'm capped at ~1900 tokens per response due to API rate limits (Groq's free tier allows ~6000 tokens/minute). This keeps responses fast and reliable. For longer content, try breaking your question into parts or ask me to continue in a follow-up message.";
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
export const formatError = (error) => {
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
export const classifyTaskType = (messages, subject) => {
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
const classifyWithAI = async (userMessage) => {
    try {
        const apiKey = getApiKeyAtIndex(0);
        if (!apiKey)
            return "default";
        const classificationPrompt = `You are a task classifier. Analyze this user message and respond with ONLY one of these labels: coding, reasoning, default, lightweight

Message: "${userMessage.slice(0, 500)}"

Respond with only the label (no explanation):`;
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "mixtral-8x7b-32768",
                messages: [{ role: "user", content: classificationPrompt }],
                temperature: 0,
                max_tokens: 10,
            }),
        });
        if (!response.ok) {
            console.warn("[classifyWithAI] Classification API returned:", response.status);
            return "default";
        }
        const data = await response.json();
        const classification = data.choices?.[0]?.message?.content?.trim().toLowerCase() || "";
        // Validate and return the classification
        const validTypes = ["coding", "reasoning", "default", "lightweight"];
        if (validTypes.includes(classification)) {
            return classification;
        }
        return "default";
    }
    catch (error) {
        console.warn("[classifyWithAI] Failed to classify with AI:", formatError(error));
        return "default";
    }
};
// ============================================================================
// MODEL SELECTION
// ============================================================================
// Models that are unavailable or should not be used
const BLOCKED_MODELS = ["gemma2-9b", "gemma-2-9b-it", "gemma2-9b-it"];
const filterBlockedModels = (models) => {
    return models
        .map(m => normalizeModelId(m)) // Normalize each model ID
        .filter(m => !BLOCKED_MODELS.includes(m.toLowerCase()));
};
class GroqUpstreamError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.name = "GroqUpstreamError";
        this.statusCode = statusCode;
    }
}
const getRetryAfterMs = (response) => {
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
const getModelsForTaskType = (taskType, userModel, estimatedTokens) => {
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
const foldSystemIntoUser = (messages) => {
    const systemMsg = messages.find(m => m.role === "system");
    if (!systemMsg)
        return messages;
    const rest = messages.filter(m => m.role !== "system");
    const firstUser = rest.find(m => m.role === "user");
    if (!firstUser)
        return rest;
    return rest.map(m => m === firstUser
        ? { ...m, content: `${systemMsg.content}\n\n${m.content}` }
        : m);
};
// ============================================================================
// FAST PATH: For simple messages like greetings - no queue, lightweight model
// ============================================================================
const callFastChat = async (payload) => {
    assertApiKeys();
    const availableModels = filterBlockedModels([LIGHTWEIGHT_MODEL, DEFAULT_FALLBACK_MODEL, LAST_RESORT_MODEL]);
    const model = availableModels[0] || LAST_RESORT_MODEL;
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
    let controller = null;
    let timeoutId = null;
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
export const callGroqChat = async (payload, taskType = "default", userSelectedModel) => {
    assertApiKeys();
    // FAST PATH: Simple messages like "hi" skip the queue and use lightweight model only
    if (isSimpleMessage(payload.messages)) {
        try {
            return await callFastChat(payload);
        }
        catch (error) {
            // Fast path failed (e.g., request too large), fall through to normal path
            console.log("[Groq] Fast path failed, using normal path");
        }
    }
    // Estimate tokens BEFORE model selection
    const messageText = payload.messages.map(m => m.content).join(" ");
    const estimatedInputTokens = Math.ceil(messageText.length / 3.5);
    const estimatedTokens = estimatedInputTokens + payload.max_tokens;
    const taskModels = getModelsForTaskType(taskType, userSelectedModel, estimatedTokens);
    const modelsToTry = [...new Set([...taskModels, DEFAULT_MODEL])];
    console.log(`[Groq] Task: "${taskType}" → Models: ${modelsToTry.join(" → ")} | API Keys: ${apiKeys.length} | Est. tokens: ${estimatedTokens}`);
    let lastError = null;
    const startingKeyIndex = getNextApiKeyIndex();
    // Wait in queue to prevent overwhelming the API
    await enqueueRequest();
    const MAX_RETRY_ROUNDS_PER_MODEL = 2;
    // Try each model with each API key. Retry transient 429s after the advertised
    // wait, otherwise a short retry-after just burns time and the model is never
    // attempted again.
    for (const model of modelsToTry) {
        const contextLimit = MODEL_CONTEXT_LIMITS[model] || 8192;
        if (estimatedInputTokens + MIN_COMPLETION_TOKENS > contextLimit) {
            lastError = new GroqUpstreamError(413, `Groq API Error: 413 - Request too large for ${model}`);
            console.warn(`[Groq] ${model} skipped: prompt exceeds context window`);
            continue;
        }
        let tryNextModel = false;
        for (let retryRound = 0; retryRound < MAX_RETRY_ROUNDS_PER_MODEL && !tryNextModel; retryRound++) {
            for (let keyOffset = 0; keyOffset < apiKeys.length; keyOffset++) {
                const keyIndex = (startingKeyIndex + keyOffset) % apiKeys.length;
                const apiKey = getApiKeyAtIndex(keyIndex);
                if (!apiKey)
                    continue;
                // Apply safe max tokens limit for this specific model and current prompt.
                const safeMaxTokens = getSafeMaxTokens(model, payload.max_tokens, estimatedInputTokens);
                const requestTokens = estimatedInputTokens + safeMaxTokens;
                await waitForToken(keyIndex, requestTokens);
                let controller = null;
                let timeoutId = null;
                try {
                    console.log(`[Groq] Trying: ${model} with key #${keyIndex + 1}${retryRound > 0 ? ` (retry ${retryRound + 1})` : ""}`);
                    // Set up timeout for the request (120 seconds)
                    controller = new AbortController();
                    timeoutId = setTimeout(() => {
                        console.warn(`[Groq] Request timeout for ${model} after 120s`);
                        controller.abort();
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
                        // On 429 (rate limit) — detect TPD vs per-minute limits
                        if (statusCode === 429) {
                            lastError = new GroqUpstreamError(429, `Groq API Error: 429 - ${errorMessage}`);
                            const isDaily = errorMessage.includes("per day") || errorMessage.includes("tokens per day") || errorMessage.includes("TPD");
                            if (isDaily) {
                                // Daily limit hit — no other key can help, skip to next model entirely
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
        }
        // All keys exhausted for this model, try next model
    }
    throw lastError instanceof Error ? lastError : new GroqUpstreamError(503, "AI service failed after trying all models and API keys");
};
// ============================================================================
// MAIN API CALL - STREAMING VERSION
// ============================================================================
export const callGroqChatStream = async (payload, taskType = "default", userSelectedModel) => {
    assertApiKeys();
    // Estimate tokens BEFORE model selection
    const messageText = payload.messages.map(m => m.content).join(" ");
    const estimatedInputTokens = Math.ceil(messageText.length / 3.5);
    const estimatedTokens = estimatedInputTokens + payload.max_tokens;
    const taskModels = getModelsForTaskType(taskType, userSelectedModel, estimatedTokens);
    const modelsToTry = [...new Set([...taskModels, DEFAULT_MODEL])];
    console.log(`[Groq] Task: "${taskType}" → Models: ${modelsToTry.join(" → ")} | API Keys: ${apiKeys.length} | Est. tokens: ${estimatedTokens}`);
    let lastError = null;
    const startingKeyIndex = getNextApiKeyIndex();
    // Wait in queue to prevent overwhelming the API
    await enqueueRequest();
    const MAX_RETRY_ROUNDS_PER_MODEL = 2;
    // Try each model with each API key. Retry transient 429s after waiting so
    // short Groq retry-after windows do not immediately fall through to 500s.
    for (const model of modelsToTry) {
        const contextLimit = MODEL_CONTEXT_LIMITS[model] || 8192;
        if (estimatedInputTokens + MIN_COMPLETION_TOKENS > contextLimit) {
            lastError = new GroqUpstreamError(413, `Groq API Error: 413 - Request too large for ${model}`);
            console.warn(`[Groq] ${model} skipped: prompt exceeds context window`);
            continue;
        }
        let tryNextModel = false;
        for (let retryRound = 0; retryRound < MAX_RETRY_ROUNDS_PER_MODEL && !tryNextModel; retryRound++) {
            for (let keyOffset = 0; keyOffset < apiKeys.length; keyOffset++) {
                const keyIndex = (startingKeyIndex + keyOffset) % apiKeys.length;
                const apiKey = getApiKeyAtIndex(keyIndex);
                if (!apiKey)
                    continue;
                // Apply safe max tokens limit for this specific model and current prompt.
                const safeMaxTokens = getSafeMaxTokens(model, payload.max_tokens, estimatedInputTokens);
                const requestTokens = estimatedInputTokens + safeMaxTokens;
                await waitForToken(keyIndex, requestTokens);
                let controller = null;
                let timeoutId = null;
                try {
                    console.log(`[Groq] Trying: ${model} with key #${keyIndex + 1} (streaming${retryRound > 0 ? ` retry ${retryRound + 1}` : ""})`);
                    // Set up timeout for the request (90 seconds for streaming)
                    controller = new AbortController();
                    timeoutId = setTimeout(() => {
                        console.warn(`[Groq] Streaming request timeout for ${model} after 90s`);
                        controller.abort();
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
                        // On 429 (rate limit) — detect TPD vs per-minute limits
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
        }
        // All keys exhausted for this model, try next model
    }
    throw lastError instanceof Error ? lastError : new GroqUpstreamError(503, "AI service failed after trying all models and API keys");
};
// Backward compatibility aliases
export const callHfChat = callGroqChat;
export const callHfChatStream = callGroqChatStream;
//# sourceMappingURL=_utils.js.map
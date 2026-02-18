import { getMoodProfile } from "@/utils/mood";

// ============================================================================
// CONFIGURATION: Where we send AI requests and which models to use
// ============================================================================

const HF_CHAT_URL =
  process.env.HF_CHAT_URL || "https://router.huggingface.co/v1/chat/completions";

// The main model we use for general questions
const DEFAULT_MODEL = "Qwen/Qwen3-72B-Instruct";

// Specialized models for specific types of questions:
const CODING_MODEL = "Qwen/Qwen3-Coder-30B-A3B-Instruct";  // Best at programming questions
const REASONING_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct";  // Reasoning specialist, widely available
const MATH_MODEL = "Qwen/Qwen3-72B-Instruct"; // Explicit math specialist, which is also our default
// MATH_MODEL removed as it was not supported by the provider

// Type definition: what kind of question is the user asking?
export type TaskType = "coding" | "reasoning" | "math_reasoning" | "default";

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
const REASONING_KEYWORDS = [
  "prove", "proof", "derive", "calculate", "solve", "integral", "derivative", 
  "equation", "theorem", "physics", "chemistry", "biology", "logic", "math", 
  "algebra", "geometry", "calculus", "trigonometry", "statistics", "probability",
  "science", "molecular", "atomic", "quantum", "formula", "vector", "matrix",
  "limit", "fraction", "decimal", "ratio", "percentage", "square root", "exponent"
];

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

const apiKeys = [
  process.env.HF_API_KEY,
  process.env.HF_API_KEY_2,
].filter((key): key is string => Boolean(key));

let nextApiKeyIndex = 0;

const getNextApiKeyIndex = () => {
  if (apiKeys.length === 0) return 0;
  const currentIndex = nextApiKeyIndex % apiKeys.length;
  nextApiKeyIndex = (nextApiKeyIndex + 1) % apiKeys.length;
  return currentIndex;
};

const getApiKeyAtIndex = (baseIndex: number, offset = 0) => {
  if (apiKeys.length === 0) return null;
  const index = (baseIndex + offset) % apiKeys.length;
  return apiKeys[index];
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

const parseErrorMessage = async (response: Response) => {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (parsed?.error) return typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
    return JSON.stringify(parsed);
  } catch {
    return raw || response.statusText;
  }
};

export const assertApiKeys = () => {
  if (apiKeys.length === 0) {
    throw new Error("Missing HF_API_KEY");
  }
};

export const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
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
  if (subject === "math") {
    return "math_reasoning";
  }
  
  const reasoningSubjects = ["physics", "chemistry", "biology", "engineering"];
  if (subject && reasoningSubjects.includes(subject)) {
    return "reasoning";
  }

  // 2. Keyword-based detection (Fallback)
  const userMessages = messages
    .filter(m => m.role === "user")
    .map(m => m.content.toLowerCase())
    .join(" ");

  const codingMatches = CODING_KEYWORDS.filter(keyword => userMessages.includes(keyword)).length;
  const reasoningMatches = REASONING_KEYWORDS.filter(keyword => userMessages.includes(keyword)).length;

  // Reduced threshold to 1 for better sensitivity on short queries
  if (codingMatches > reasoningMatches && codingMatches >= 1) {
    return "coding";
  }
  if (reasoningMatches > codingMatches && reasoningMatches >= 1) {
    return "reasoning";
  }
  
  return "default";
};

// ============================================================================
// MODEL SELECTION
// ============================================================================

const getModelsForTaskType = (taskType: TaskType): string[] => {
  switch (taskType) {
    case "coding":
      return [CODING_MODEL, DEFAULT_MODEL];
    case "reasoning":
      // Prioritize the reasoning model, then default
      return [REASONING_MODEL, DEFAULT_MODEL];
    case "math_reasoning":
      // Prioritize the math model, then reasoning, then default
      return [MATH_MODEL, REASONING_MODEL, DEFAULT_MODEL];
    case "default":
    default:
      return [DEFAULT_MODEL];
  }
};

// ============================================================================
// MAIN API CALL
// ============================================================================

export const callHfChat = async (
  payload: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    max_tokens: number;
    temperature: number;
  },
  taskType: TaskType = "default"
) => {
  assertApiKeys();
  let lastError: unknown = null;

  const tryModelWithApiKey = async (model: string, retryCount = 0): Promise<string> => {
    const keyIndexBase = getNextApiKeyIndex();
    const activeKey = getApiKeyAtIndex(keyIndexBase, retryCount);
    
    if (!activeKey) throw new Error("No HF API keys available");

    try {
      const response = await fetch(HF_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: payload.messages,
          max_tokens: payload.max_tokens,
          temperature: payload.temperature,
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response);
        throw new Error(`HF API Error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
      
    } catch (error) {
      const message = formatError(error);
      lastError = error;
      console.error(`[HF] Request failed for model ${model} (attempt ${retryCount + 1})`, message);
      
      if (retryCount < apiKeys.length - 1) {
        return tryModelWithApiKey(model, retryCount + 1);
      }
      throw error;
    }
  };

  const taskModels = getModelsForTaskType(taskType);
  const modelsToTry = [...new Set([...taskModels, DEFAULT_MODEL])];
  
  console.log(`[HF] Question type: "${taskType}" → Trying models:`, modelsToTry);

  for (const model of modelsToTry) {
    try {
      console.log(`[HF] Attempting with model: ${model}`);
      return await tryModelWithApiKey(model);
    } catch (error) {
      const message = formatError(error);
      lastError = error;
      console.warn(`[HF] Model ${model} failed: ${message}. Trying next model...`);
      continue;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("AI request failed after trying all models");
};

export { getMoodProfile };

import { getMoodProfile } from "@/utils/mood";

// ============================================================================
// CONFIGURATION: Where we send AI requests and which models to use
// ============================================================================

const HF_CHAT_URL =
  process.env.HF_CHAT_URL || "https://router.huggingface.co/v1/chat/completions";

// The main model we use for general questions
const DEFAULT_MODEL = "Qwen/Qwen2.5-72B-Instruct";

// Specialized models for specific types of questions:
const CODING_MODEL = "Qwen/Qwen2.5-Coder-32B-Instruct";  // Best at programming questions
const REASONING_MODEL = "gpt-oss-20b";  // Best at math, science, and logic problems

// Type definition: what kind of question is the user asking?
export type TaskType = "coding" | "reasoning" | "default";

// ============================================================================
// SMART QUESTION DETECTION: How we figure out what type of question it is
// ============================================================================

// Words that indicate a CODING question (like "write a function" or "debug my code")
const CODING_KEYWORDS = [
  "code", "coding", "program", "programming", "function", "method", "class",
  "debug", "debugging", "algorithm", "script", "syntax", "compiler", "variable",
  "api", "endpoint", "database", "sql", "query", "javascript", "python", "java",
  "typescript", "react", "node", "html", "css", "git", "repository", "commit",
  "array", "object", "loop", "iteration", "recursion", "exception", "error handling",
  "refactor", "optimization", "performance", "async", "await", "promise", "callback"
];

// Words that indicate a REASONING question (like "prove this theorem" or "solve this equation")
const REASONING_KEYWORDS = [
  "prove", "proof", "derive", "derivation", "calculate", "calculation", "solve",
  "integral", "derivative", "equation", "theorem", "physics", "chemistry",
  "biology", "logic", "mathematical", "mathematics", "algebra", "geometry",
  "calculus", "trigonometry", "statistics", "probability", "hypothesis",
  "experiment", "molecular", "atomic", "quantum", "thermodynamics", "kinetics",
  "stoichiometry", "synthesis", "reaction", "compound", "formula", "vector",
  "matrix", "differential", "integration", "limit", "convergence", "series"
];

// ============================================================================
// API KEY MANAGEMENT: We rotate through multiple API keys to avoid rate limits
// ============================================================================

// Load API keys from environment variables (.env file)
const apiKeys = [
  process.env.HF_API_KEY,
  process.env.HF_API_KEY_2,
].filter((key): key is string => Boolean(key));

// Track which API key to use next (we cycle through them to spread out requests)
let nextApiKeyIndex = 0;

// Get the next API key index and move the counter forward for next time
const getNextApiKeyIndex = () => {
  if (apiKeys.length === 0) return 0;
  
  const currentIndex = nextApiKeyIndex % apiKeys.length;
  nextApiKeyIndex = (nextApiKeyIndex + 1) % apiKeys.length;  // Advance to next key
  
  return currentIndex;
};

// Get a specific API key by its index (with optional offset for retries)
const getApiKeyAtIndex = (baseIndex: number, offset = 0) => {
  if (apiKeys.length === 0) return null;
  const index = (baseIndex + offset) % apiKeys.length;
  return apiKeys[index];
};

// ============================================================================
// ERROR HANDLING: Extract useful error messages from API responses
// ============================================================================

const parseErrorMessage = async (response: Response) => {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (parsed?.error) {
      return typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
    }
    if (parsed?.message) {
      return typeof parsed.message === "string" ? parsed.message : JSON.stringify(parsed.message);
    }
    return JSON.stringify(parsed);
  } catch {
    return raw || response.statusText;
  }
};

// Check if we have at least one API key configured
export const assertApiKeys = () => {
  if (apiKeys.length === 0) {
    throw new Error("Missing HF_API_KEY (set HF_API_KEY/HF_API_KEY_2 in .env and restart dev server)");
  }
};

// Convert any error into a readable string message
export const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

// ============================================================================
// QUESTION CLASSIFIER: Analyze the user's message and decide what type it is
// ============================================================================

/**
 * Look at what the user wrote and figure out if it's a coding question,
 * a math/science question, or just a general question.
 * 
 * How it works:
 * 1. Combine all the user's messages into one big text
 * 2. Count how many coding keywords appear (like "function", "debug", etc.)
 * 3. Count how many reasoning keywords appear (like "prove", "calculate", etc.)
 * 4. Whichever has more matches (and at least 2) wins!
 * 5. If neither has enough matches, it's a "default" general question
 */
export const classifyTaskType = (messages: Array<{ role: string; content: string }>): TaskType => {
  // Step 1: Grab all user messages and combine them (ignore AI responses)
  const userMessages = messages
    .filter(m => m.role === "user")
    .map(m => m.content.toLowerCase())
    .join(" ");

  // Step 2: Count how many keywords match
  const codingMatches = CODING_KEYWORDS.filter(keyword => userMessages.includes(keyword)).length;
  const reasoningMatches = REASONING_KEYWORDS.filter(keyword => userMessages.includes(keyword)).length;

  // Step 3: Pick the category with the most matches (need at least 2 to be sure)
  if (codingMatches > reasoningMatches && codingMatches >= 2) {
    return "coding";
  }
  if (reasoningMatches > codingMatches && reasoningMatches >= 2) {
    return "reasoning";
  }
  
  // Step 4: Default to general questions if no clear match
  return "default";
};

// ============================================================================
// MODEL SELECTION: Pick the right AI model based on question type
// ============================================================================

/**
 * For each type of question, we have a prioritized list of models to try.
 * If the first model fails, we automatically try the next one (fallback).
 */
const getModelsForTaskType = (taskType: TaskType): string[] => {
  switch (taskType) {
    case "coding":
      // Try coding specialist first, then fall back to general model
      return [CODING_MODEL, DEFAULT_MODEL];
    
    case "reasoning":
      // Try reasoning specialist first, then fall back to general model
      return [REASONING_MODEL, DEFAULT_MODEL];
    
    case "default":
    default:
      // Just use the general-purpose model
      return [DEFAULT_MODEL];
  }
};

// ============================================================================
// MAIN API CALL: Send the question to the AI and get an answer
// ============================================================================

/**
 * This is the main function that talks to the AI!
 * 
 * What it does:
 * 1. Picks the right AI model based on the question type
 * 2. Tries to send the request with the first API key
 * 3. If that fails, tries again with the next API key
 * 4. If all keys fail, tries the next model in the list
 * 5. Keeps trying until it works or we run out of options
 */
export const callHfChat = async (
  payload: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    max_tokens: number;
    temperature: number;
  },
  taskType: TaskType = "default"
) => {
  // Make sure we have API keys before starting
  assertApiKeys();
  let lastError: unknown = null;

  /**
   * Try calling the AI with a specific model and API key.
   * If it fails, automatically retry with the next API key.
   */
  const tryModelWithApiKey = async (model: string, retryCount = 0): Promise<string> => {
    // Pick which API key to use (rotates through available keys)
    const keyIndexBase = getNextApiKeyIndex();
    const activeKey = getApiKeyAtIndex(keyIndexBase, retryCount);
    
    if (!activeKey) throw new Error("No HF API keys available");

    try {
      // Send the actual request to the AI service
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

      // Check if the request failed
      if (!response.ok) {
        const errorMessage = await parseErrorMessage(response);
        throw new Error(`HF API Error: ${response.status} - ${errorMessage}`);
      }

      // Extract the AI's response from the JSON
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
      
    } catch (error) {
      const message = formatError(error);
      lastError = error;
      console.error(`[HF] Request failed for model ${model} (attempt ${retryCount + 1})`, message);
      
      // If we have more API keys to try, retry with the next one
      if (retryCount < apiKeys.length - 1) {
        return tryModelWithApiKey(model, retryCount + 1);
      }
      
      // No more keys to try - give up on this model
      throw error;
    }
  };

  // Build the full list of models to try (based on question type + fallbacks)
  const taskModels = getModelsForTaskType(taskType);
  const modelsToTry = [...new Set([...taskModels, DEFAULT_MODEL])];  // Remove duplicates
  
  console.log(`[HF] Question type: "${taskType}" → Trying models:`, modelsToTry);

  // Try each model in order until one works
  for (const model of modelsToTry) {
    try {
      console.log(`[HF] Attempting with model: ${model}`);
      return await tryModelWithApiKey(model);
    } catch (error) {
      const message = formatError(error);
      lastError = error;
      
      console.warn(`[HF] Model ${model} failed: ${message}. Trying next model...`);
      // Continue to next model in the list
      continue;
    }
  }

  // If we get here, all models failed - throw the last error we got
  throw lastError instanceof Error ? lastError : new Error("AI request failed after trying all models");
};

// Re-export the mood profile helper for use in other files
export { getMoodProfile };

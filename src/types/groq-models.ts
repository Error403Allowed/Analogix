/**
 * Available Groq models for user selection.
 *
 * Lineup verified against the live Groq API (August 2026). All IDs below map
 * to production models currently served by Groq — deprecated models
 * (llama-3.1-8b-instant, llama-3.3-70b-versatile, llama-4-scout,
 * qwen-3-32b, etc.) have been replaced by their recommended successors.
 */
export type GroqModelId =
  | "auto"
  | "gpt-oss-120b"
  | "qwen-3.6-27b"
  | "gpt-oss-20b";

export interface GroqModelConfig {
  id: GroqModelId;
  name: string;
  description: string; // Short phrase explaining what it's good for
  modelString: string; // The actual model string sent to Groq API
  maxTokens: number;
}

export const GROQ_MODELS: GroqModelConfig[] = [
  {
    id: "auto",
    name: "Auto (Recommended)",
    description: "Analogix AI auto-picks the best model for your query",
    modelString: "auto",
    maxTokens: 8192,
  },
  {
    id: "gpt-oss-120b",
    name: "The A-Student",
    description: "Analogix's most reliable and versatile model for complex tasks, coding and STEM",
    modelString: "openai/gpt-oss-120b",
    maxTokens: 8192,
  },
  {
    id: "qwen-3.6-27b",
    name: "STEM Professor",
    description: "Analogix's strongest reasoning model for math, science and coding — with vision",
    modelString: "qwen/qwen3.6-27b",
    maxTokens: 8192,
  },
  {
    id: "gpt-oss-20b",
    name: "Quick Quizzer",
    description: "Analogix's fastest and most lightweight model for quick questions",
    modelString: "openai/gpt-oss-20b",
    maxTokens: 4096,
  },
];

/**
 * Legacy model IDs persisted by older versions of the app (in localStorage
 * keys `selectedGroqModel` / `analogix_agent_model`). These referenced
 * deprecated Groq models; map them to the current lineup so saved choices
 * keep working after the migration.
 */
const LEGACY_MODEL_ID_MAP: Record<string, GroqModelId> = {
  "llama-4-scout": "qwen-3.6-27b",
  "llama-3.3-70b": "gpt-oss-120b",
  "qwen-3-32b": "qwen-3.6-27b",
  "llama-3.1-8b": "gpt-oss-20b",
};

/**
 * Normalize any stored/supplied model ID (including legacy IDs from before
 * the model-lineup refresh) to the current set of GroqModelId values.
 * Falls back to "auto" for unknown values.
 */
export const normalizeGroqModelId = (modelId: string | null | undefined): GroqModelId => {
  if (!modelId) return "auto";
  const id = LEGACY_MODEL_ID_MAP[modelId] ?? modelId;
  return GROQ_MODELS.some((m) => m.id === id) ? (id as GroqModelId) : "auto";
};

/**
 * Get the model config by ID
 */
export const getGroqModelConfig = (modelId: GroqModelId): GroqModelConfig => {
  const config = GROQ_MODELS.find(m => m.id === modelId);
  if (!config) {
    // Default to auto if invalid
    return GROQ_MODELS[0];
  }
  return config;
};

/**
 * Get the actual model string to send to Groq API
 * For "auto", returns undefined so the backend can decide
 */
export const getGroqModelString = (modelId: GroqModelId): string | undefined => {
  if (modelId === "auto") {
    return undefined;
  }
  const config = getGroqModelConfig(modelId);
  return config.modelString;
};
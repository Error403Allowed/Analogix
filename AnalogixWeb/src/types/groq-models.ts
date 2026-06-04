/**
 * Available Groq models for user selection
 */
export type GroqModelId =
  | "auto"
  | "llama-4-scout"
  | "llama-3.3-70b"
  | "qwen-3-32b"
  | "llama-3.1-8b";

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
    id: "llama-4-scout",
    name: "Jack of All Trades",
    description: "Analogix's best all-rounder for STEM subjects, creativity and chat",
    modelString: "meta-llama/llama-4-scout-17b-16e-instruct",
    maxTokens: 8192,
  },
  {
    id: "llama-3.3-70b",
    name: "The A-Student",
    description: "Analogix's most reliable and versatile model for complex tasks",
    modelString: "llama-3.3-70b-versatile",
    maxTokens: 8192,
  },
  {
    id: "qwen-3-32b",
    name: "STEM Professor",
    description: "Analogix's strongest model for math, science and coding",
    modelString: "qwen/qwen3-32b",
    maxTokens: 8192,
  },
  {
    id: "llama-3.1-8b",
    name: "Quick Quizzer",
    description: "Analogix's fastest and most lightweight for quick questions",
    modelString: "llama-3.1-8b-instant",
    maxTokens: 4096,
  },
];

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

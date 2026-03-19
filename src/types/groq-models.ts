/**
 * Available Groq models for user selection
 */
export type GroqModelId = 
  | "auto"
  | "llama-4-scout"
  | "llama-3.3-70b"
  | "qwen-3-32b"
  | "deepseek-r1-distill"
  | "llama-3.1-8b"
  | "gemma2-9b";

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
    description: "Auto-picks the best model for your query",
    modelString: "auto",
    maxTokens: 8192,
  },
  {
    id: "llama-4-scout",
    name: "Llama 4 Scout",
    description: "Best all-rounder for coding and chat",
    modelString: "meta-llama/llama-4-scout-17b-16e-instruct",
    maxTokens: 8192,
  },
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    description: "Reliable and versatile for complex tasks",
    modelString: "llama-3.3-70b-versatile",
    maxTokens: 8192,
  },
  {
    id: "qwen-3-32b",
    name: "Qwen 3 32B",
    description: "Strong reasoning for math and science",
    modelString: "qwen-3-32b",
    maxTokens: 8192,
  },
  {
    id: "deepseek-r1-distill",
    name: "DeepSeek R1 Distill",
    description: "Specialized for math, physics, and logic",
    modelString: "deepseek-r1-distill-llama-70b",
    maxTokens: 8192,
  },
  {
    id: "llama-3.1-8b",
    name: "Llama 3.1 8B",
    description: "Fast and lightweight for quick questions",
    modelString: "llama-3.1-8b-instant",
    maxTokens: 4096,
  },
  {
    id: "gemma2-9b",
    name: "Gemma 2 9B",
    description: "Creative and conversational for ideas",
    modelString: "gemma2-9b-it",
    maxTokens: 8192,
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

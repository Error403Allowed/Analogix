export type GroqModelId =
  | "auto"
  | "llama-4-scout"
  | "llama-3.3-70b"
  | "qwen-3-32b"
  | "llama-3.1-8b";

export interface GroqModelConfig {
  id: GroqModelId;
  name: string;
  description: string;
  modelString: string;
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
    modelString: "qwen/qwen3.6-27b",
    maxTokens: 8192,
  },
  {
    id: "llama-3.3-70b",
    name: "The A-Student",
    description: "Analogix's most reliable and versatile model for complex tasks",
    modelString: "openai/gpt-oss-120b",
    maxTokens: 8192,
  },
  {
    id: "qwen-3-32b",
    name: "STEM Professor",
    description: "Analogix's strongest model for math, science and coding",
    modelString: "qwen/qwen3.6-27b",
    maxTokens: 8192,
  },
  {
    id: "llama-3.1-8b",
    name: "Quick Quizzer",
    description: "Analogix's fastest and most lightweight for quick questions",
    modelString: "openai/gpt-oss-20b",
    maxTokens: 4096,
  },
];

export const getGroqModelConfig = (modelId: GroqModelId): GroqModelConfig => {
  return GROQ_MODELS.find((m) => m.id === modelId) ?? GROQ_MODELS[0];
};

export const getGroqModelString = (modelId: GroqModelId): string | undefined => {
  if (modelId === "auto") return undefined;
  return getGroqModelConfig(modelId).modelString;
};

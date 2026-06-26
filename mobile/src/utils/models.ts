export interface AiModel {
  id: string;
  name: string;
  description: string;
  apiModel: string;
  maxTokens: number;
}

export const AI_MODELS: AiModel[] = [
  {
    id: "auto",
    name: "Auto (Recommended)",
    description: "Auto-picks best model",
    apiModel: "auto",
    maxTokens: 8192,
  },
  {
    id: "llama-4-scout",
    name: "Jack of All Trades",
    description: "Best all-rounder",
    apiModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    maxTokens: 8192,
  },
  {
    id: "llama-3.3-70b",
    name: "The A-Student",
    description: "Most reliable for complex tasks",
    apiModel: "llama-3.3-70b-versatile",
    maxTokens: 8192,
  },
  {
    id: "qwen-3-32b",
    name: "STEM Professor",
    description: "Strongest for math/science/coding",
    apiModel: "qwen/qwen3-32b",
    maxTokens: 8192,
  },
  {
    id: "llama-3.1-8b",
    name: "Quick Quizzer",
    description: "Fastest for quick questions",
    apiModel: "llama-3.1-8b-instant",
    maxTokens: 4096,
  },
] as const;

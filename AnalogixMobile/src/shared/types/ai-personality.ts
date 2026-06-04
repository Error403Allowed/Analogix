import type { MemoryType } from "./memory";

export interface AIPersonality {
  id?: string | null;
  user_id?: string;
  friendliness: number;
  formality: number;
  humor: number;
  detail_level: number;
  patience: number;
  encouragement: number;
  socratic_method: boolean;
  step_by_step: boolean;
  real_world_examples: boolean;
  custom_instructions: string;
  persona_description: string;
  use_emojis: boolean;
  use_analogies: boolean;
  analogy_frequency: number;
  use_section_dividers: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AIMemoryFragment {
  id: string;
  user_id: string;
  content: string;
  memory_type: MemoryType;
  importance: number;
  reinforcement_count: number;
  last_accessed_at: string;
  created_at: string;
  session_id?: string | null;
}

export interface AIMemorySummary {
  id: string;
  user_id: string;
  summary: string;
  topics: string[];
  subject_id?: string | null;
  start_date: string;
  end_date: string;
  conversation_count: number;
  created_at: string;
}

export interface AIMemoryResponse {
  memories: AIMemoryFragment[];
  summaries: AIMemorySummary[];
}

export const DEFAULT_AI_PERSONALITY: AIPersonality = {
  friendliness: 70,
  formality: 30,
  humor: 50,
  detail_level: 65,
  patience: 70,
  encouragement: 70,
  socratic_method: false,
  step_by_step: true,
  real_world_examples: true,
  custom_instructions: "",
  persona_description: "",
  use_emojis: true,
  use_analogies: true,
  analogy_frequency: 3,
  use_section_dividers: true,
};

export const PERSONALITY_PRESETS = {
  friendly_tutor: {
    name: "Friendly Tutor",
    description: "Warm, encouraging, and patient",
    settings: {
      friendliness: 85,
      formality: 20,
      humor: 60,
      detail_level: 60,
      patience: 90,
      encouragement: 90,
      socratic_method: true,
      step_by_step: true,
      real_world_examples: true,
      use_emojis: true,
      use_analogies: true,
      analogy_frequency: 4,
      use_section_dividers: true,
    },
  },
  strict_professor: {
    name: "Strict Professor",
    description: "Formal, detailed, and rigorous",
    settings: {
      friendliness: 40,
      formality: 80,
      humor: 10,
      detail_level: 90,
      patience: 50,
      encouragement: 40,
      socratic_method: true,
      step_by_step: true,
      real_world_examples: false,
      use_emojis: false,
      use_analogies: false,
      analogy_frequency: 0,
      use_section_dividers: true,
    },
  },
  casual_buddy: {
    name: "Casual Study Buddy",
    description: "Relaxed, fun, and relatable",
    settings: {
      friendliness: 90,
      formality: 10,
      humor: 80,
      detail_level: 40,
      patience: 70,
      encouragement: 80,
      socratic_method: false,
      step_by_step: true,
      real_world_examples: true,
      use_emojis: true,
      use_analogies: true,
      analogy_frequency: 5,
      use_section_dividers: true,
    },
  },
  concise_expert: {
    name: "Concise Expert",
    description: "Direct, efficient, and factual",
    settings: {
      friendliness: 50,
      formality: 50,
      humor: 20,
      detail_level: 30,
      patience: 60,
      encouragement: 50,
      socratic_method: false,
      step_by_step: false,
      real_world_examples: false,
      use_emojis: false,
      use_analogies: false,
      analogy_frequency: 0,
      use_section_dividers: true,
    },
  },
} as const;

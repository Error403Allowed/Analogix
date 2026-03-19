/**
 * AI Personality & Memory Types
 */

export interface AIPersonality {
  id?: string | null;
  user_id?: string;
  
  // Personality traits (0-100)
  friendliness: number;
  formality: number;
  humor: number;
  detail_level: number;
  patience: number;
  encouragement: number;
  
  // Teaching style
  socratic_method: boolean;
  step_by_step: boolean;
  real_world_examples: boolean;
  
  // Custom instructions
  custom_instructions: string;
  persona_description: string;
  
  // Response preferences
  use_emojis: boolean;
  use_analogies: boolean;
  analogy_frequency: number; // 0-5
  use_section_dividers: boolean; // Use horizontal dashes (⸻) to separate sections

  created_at?: string;
  updated_at?: string;
}

export type MemoryType = "fact" | "preference" | "skill" | "goal" | "context";

export interface AIMemoryFragment {
  id: string;
  user_id: string;
  content: string;
  memory_type: MemoryType;
  importance: number; // 0-1
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

/**
 * Default personality settings
 */
export const DEFAULT_AI_PERSONALITY: AIPersonality = {
  friendliness: 70,
  formality: 30,
  humor: 50,
  detail_level: 50,
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

/**
 * Personality preset configurations
 */
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
};

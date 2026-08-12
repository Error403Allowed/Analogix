export type MemoryLayer = "conversational" | "educational" | "workspace" | "semantic" | "execution";
export type MemoryType =
  | "fact"
  | "preference"
  | "skill"
  | "goal"
  | "context"
  | "strength"
  | "weakness"
  | "learning_style"
  | "study_pattern";

export interface MemoryFragment {
  id: string;
  user_id: string;
  content: string;
  memory_type: MemoryType;
  layer: MemoryLayer;
  importance: number;
  reinforced_count: number;
  last_accessed_at: string;
  created_at: string;
  session_id?: string;
  subject_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

export interface MemoryRetrievalOptions {
  layers: MemoryLayer[];
  query?: string;
  subject_ids?: string[];
  limit?: number;
  min_importance?: number;
}

export interface RetrievedMemory {
  fragment: MemoryFragment;
  relevance_score: number;
  layer: MemoryLayer;
}

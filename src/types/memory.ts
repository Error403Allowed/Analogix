export type MemoryLayer = 'conversational' | 'educational' | 'workspace' | 'semantic' | 'execution';

export type MemoryType = 'fact' | 'preference' | 'skill' | 'goal' | 'context' | 'strength' | 'weakness' | 'learning_style' | 'study_pattern';

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

export interface ConversationalMemory {
  current_topic?: string;
  recent_messages: ConversationSummary[];
  pending_clarifications: string[];
}

export interface ConversationSummary {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  key_entities?: string[];
}

export interface EducationalMemory {
  strengths: SubjectMemory[];
  weak_areas: WeakAreaMemory[];
  learning_style?: LearningStyle;
  study_patterns: StudyPatternMemory[];
  quiz_performance: QuizPerformanceSummary[];
}

export interface SubjectMemory {
  subject_id: string;
  memory_type: 'strength' | 'weakness';
  content: string;
  evidence: string[];
  importance: number;
  last_reinforced?: string;
}

export interface WeakAreaMemory {
  subject_id: string;
  topic: string;
  description: string;
  related_quiz_ids: string[];
  recommended_actions: string[];
}

export interface LearningStyle {
  preferred_explanation: 'visual' | 'textual' | 'hands_on' | 'analogical';
  detail_level: 'brief' | 'moderate' | 'detailed';
  pace: 'fast' | 'moderate' | 'slow';
  practice_style: 'spaced' | 'massed' | 'mixed';
}

export interface StudyPatternMemory {
  subject_id: string;
  pattern_type: string;
  description: string;
  confidence: number;
  data_points: string[];
}

export interface QuizPerformanceSummary {
  quiz_id: string;
  subject_id: string;
  topic?: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken?: number;
  weak_topics: string[];
  created_at: string;
}

export interface WorkspaceMemory {
  active_documents: string[];
  recent_edits: RecentEdit[];
  pending_operations: string[];
  collaboration_state: CollabState;
}

export interface RecentEdit {
  entity_type: string;
  entity_id: string;
  edit_type: 'created' | 'updated' | 'deleted';
  timestamp: string;
  summary: string;
}

export interface CollabState {
  active_room_id?: string;
  active_document_id?: string;
  collaborators: CollaboratorState[];
}

export interface CollaboratorState {
  user_id: string;
  cursor_position?: CursorPosition;
  selection?: Selection;
}

export interface CursorPosition {
  path: string[];
  offset: number;
}

export interface Selection {
  start: CursorPosition;
  end: CursorPosition;
}

export interface SemanticMemory {
  long_term_facts: MemoryFragment[];
  goals: MemoryFragment[];
  personality_preferences: MemoryFragment[];
  career_aspirations?: string;
}

export interface ExecutionMemory {
  current_plan?: PlanExecutionState;
  partial_results: Map<string, unknown>;
  error_history: ExecutionError[];
}

export interface PlanExecutionState {
  plan_id: string;
  current_step: string;
  completed_steps: string[];
  context_snapshot: Record<string, unknown>;
}

export interface ExecutionError {
  step_id: string;
  error: string;
  timestamp: string;
  recovered: boolean;
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

export interface MemoryConsolidationResult {
  new_summaries: MemorySummary[];
  pruned_fragments: string[];
  reinforced_fragments: string[];
  new_memories: MemoryFragment[];
}

export interface MemorySummary {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  topics: string[];
  key_facts: string[];
  performance_summary: string;
  recommendations: string[];
}

export interface MemoryContext {
  facts: string[];
  preferences: string[];
  weak_areas: string[];
  strengths: string[];
  study_patterns: string[];
}
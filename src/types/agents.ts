export type AgentType =
  | 'planner'
  | 'retrieval'
  | 'document'
  | 'flashcard'
  | 'quiz'
  | 'study_planner'
  | 'memory'
  | 'curriculum'
  | 'validation'
  | 'collaboration';

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  model_preference?: string;
}

export interface AgentInput {
  task: string;
  context: AgentContext;
  constraints?: AgentConstraints;
  previous_results?: AgentResult[];
}

export interface AgentContext {
  user_id: string;
  workspace: {
    subjects: string[];
    active_document_id?: string;
    active_room_id?: string;
    recent_entities: string[];
  };
  conversation: {
    messages: ConversationMessage[];
    current_topic?: string;
  };
  memory: {
    relevant_facts: string[];
    preferences: string[];
    weak_areas: string[];
  };
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentConstraints {
  max_operations?: number;
  allowed_types?: string[];
  blocked_types?: string[];
  require_confirmation?: string[];
  max_retries?: number;
  timeout_ms?: number;
}

export interface AgentResult {
  agent_type: AgentType;
  success: boolean;
  output: unknown;
  confidence: number;
  side_effects: SideEffect[];
  next_steps?: string[];
  error?: string;
}

export interface SideEffect {
  type: string;
  entity_type: string;
  entity_id: string;
  description: string;
  reversible: boolean;
}

export interface AgentPlan {
  id: string;
  goal: string;
  steps: PlanStep[];
  context_needed: string[];
  estimated_complexity: 'simple' | 'moderate' | 'complex';
  created_at: string;
}

export interface PlanStep {
  id: string;
  agent_type: AgentType;
  task: string;
  depends_on: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: AgentResult;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: string;
  requires_confirmation?: boolean;
  side_effects?: SideEffect[];
  agent_types: AgentType[];
}

export interface AgentExecutionState {
  plan_id: string;
  current_step: string;
  completed_steps: string[];
  context: AgentContext;
  results: AgentResult[];
}
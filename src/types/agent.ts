export type AgentId = 'planner' | 'notes' | 'tasks' | 'collab';

export interface AIAgent {
  id: AgentId;
  name: string;
  description: string;
  icon: string;
  color: string;
  systemPrompt: string;
  enabled: boolean;
}

export interface UserAgent {
  id: string;
  userId: string;
  agentId: AgentId;
  enabled: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMemory {
  id: string;
  agentId: AgentId;
  userId: string;
  memoryType: 'preference' | 'context' | 'history';
  content: Record<string, unknown>;
  importance: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTask {
  id: string;
  triggeringAgent: AgentId;
  targetAgent: AgentId;
  action: AgentActionType;
  payload: Record<string, unknown>;
  status: 'pending' | 'awaiting_confirmation' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  userResponse?: string;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentConfirmation {
  id: string;
  userId: string;
  agentId: AgentId;
  action: AgentActionType;
  payload: Record<string, unknown>;
  summary: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  respondedAt?: string;
}

export interface AgentActionLog {
  id: string;
  userId: string;
  agentId: AgentId;
  action: AgentActionType;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'success' | 'failed' | 'partial';
  error?: string;
  executionTimeMs?: number;
  createdAt: string;
}

export const AGENT_ACTION_TYPES = [
  'create_schedule',
  'add_event',
  'add_deadline',
  'check_progress',
  'suggest_review',
  'create_document',
  'update_document',
  'delete_document',
  'summarize_doc',
  'extract_key_points',
  'create_task',
  'update_task',
  'complete_task',
  'set_reminder',
  'prioritize_tasks',
  'create_room',
  'invite_member',
  'suggest_edit',
  'sync_document',
  'start_collab_session',
  'delegate_to_agent',
] as const;

export type AgentActionType = typeof AGENT_ACTION_TYPES[number];

export const AGENT_PERMISSIONS: Record<AgentId, AgentActionType[]> = {
  planner: ['create_schedule', 'add_event', 'add_deadline', 'check_progress', 'suggest_review', 'delegate_to_agent'],
  notes: ['create_document', 'update_document', 'delete_document', 'summarize_doc', 'extract_key_points', 'delegate_to_agent'],
  tasks: ['create_task', 'update_task', 'complete_task', 'set_reminder', 'prioritize_tasks', 'delegate_to_agent'],
  collab: ['create_room', 'invite_member', 'suggest_edit', 'sync_document', 'start_collab_session', 'delegate_to_agent'],
};

export const AGENT_INTENT_PATTERNS: Record<AgentId, RegExp> = {
  planner: /schedule|planner|exam|deadline|study plan|plan my week|upcoming|due date|test|quiz next|exam next|when is|plan for/i,
  notes: /note|doc|document|write|summarize|create.*(note|doc|document)|chapter|topic|summary|overview|key points/i,
  tasks: /task|todo|assignment|remind me|track|complete|finish|done|priorit/i,
  collab: /room|collaborate|invite|study together|work with|join room|collab|group|partner|peer/i,
};

export const AGENT_ICONS: Record<AgentId, string> = {
  planner: '📅',
  notes: '📝',
  tasks: '✅',
  collab: '🤝',
};

export const AGENT_COLORS: Record<AgentId, string> = {
  planner: '#10B981',
  notes: '#3B82F6',
  tasks: '#F59E0B',
  collab: '#8B5CF6',
};

export function isAgentActionType(value: unknown): value is AgentActionType {
  return typeof value === 'string' && AGENT_ACTION_TYPES.includes(value as AgentActionType);
}

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === 'string' && ['planner', 'notes', 'tasks', 'collab'].includes(value);
}

export function canAgentPerform(agentId: AgentId, action: AgentActionType): boolean {
  return AGENT_PERMISSIONS[agentId]?.includes(action) ?? false;
}

export function detectAgentIntent(message: string): AgentId | 'general' {
  const lowerMessage = message.toLowerCase();
  
  for (const [agentId, pattern] of Object.entries(AGENT_INTENT_PATTERNS) as [AgentId, RegExp][]) {
    if (pattern.test(lowerMessage)) {
      return agentId;
    }
  }
  
  return 'general';
}

export interface CalendarIntegration {
  id: string;
  userId: string;
  provider: 'google' | 'apple';
  accessToken?: string;
  refreshToken?: string;
  calendarId?: string;
  expiresAt?: string;
  lastSyncAt?: string;
  syncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentContext {
  userId: string;
  agentId: AgentId;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  userContext: {
    grade?: string;
    state?: string;
    subjects?: string[];
    timezone?: string;
  };
  relevantDocuments?: Array<{ id: string; title: string; content: string }>;
  calendarContext?: string;
  memories?: AgentMemory[];
}

export interface AgentResponse {
  agentId: AgentId;
  content: string;
  actions: AgentAction[];
  requiresConfirmation?: boolean;
  confirmationId?: string;
  delegatedTo?: AgentId;
}

export interface AgentAction {
  type: AgentActionType;
  payload: Record<string, unknown>;
  summary: string;
}
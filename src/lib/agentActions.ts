import type { AgentId, AgentActionType } from '@/types/agent';

export const BOTTOM_RIGHT_AGENT_DOCUMENT_EDIT_MESSAGE =
  "I can read your workspace, but document edits need to happen inside the document editor. Open the document and use /ai there.";

export const BOTTOM_RIGHT_AGENT_ACTION_TYPES = [
  "add_flashcards",
  "start_quiz",
] as const;

export type BottomRightAgentActionType =
  (typeof BOTTOM_RIGHT_AGENT_ACTION_TYPES)[number];

export function isBottomRightAgentActionType(
  value: unknown,
): value is BottomRightAgentActionType {
  return typeof value === "string" &&
    (BOTTOM_RIGHT_AGENT_ACTION_TYPES as readonly string[]).includes(value);
}

export function filterBottomRightAgentActions<T extends Record<string, unknown>>(
  actions: T[],
): T[] {
  return actions.filter((action) => isBottomRightAgentActionType(action.type));
}

export const AGENT_ALL_ACTION_TYPES = [
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
  'navigate_to',
  'show_dashboard',
  'show_calendar',
  'show_subjects',
  'show_quiz',
  'show_flashcards',
  'show_rooms',
] as const;

export type AgentAllActionType = typeof AGENT_ALL_ACTION_TYPES[number];

export const AGENT_ACTION_PERMISSIONS: Record<AgentId, AgentAllActionType[]> = {
  planner: ['create_schedule', 'add_event', 'add_deadline', 'check_progress', 'suggest_review', 'delegate_to_agent', 'navigate_to', 'show_dashboard', 'show_calendar'],
  notes: ['create_document', 'update_document', 'delete_document', 'summarize_doc', 'extract_key_points', 'delegate_to_agent', 'navigate_to', 'show_subjects'],
  tasks: ['create_task', 'update_task', 'complete_task', 'set_reminder', 'prioritize_tasks', 'delegate_to_agent', 'navigate_to', 'show_dashboard', 'show_calendar'],
  collab: ['create_room', 'invite_member', 'suggest_edit', 'sync_document', 'start_collab_session', 'delegate_to_agent', 'navigate_to', 'show_rooms'],
};

export const ACTIONS_REQUIRING_CONFIRMATION: AgentAllActionType[] = [
  'create_schedule',
  'add_event',
  'add_deadline',
  'create_document',
  'update_document',
  'delete_document',
  'create_task',
  'update_task',
  'complete_task',
  'set_reminder',
  'create_room',
  'invite_member',
  'sync_document',
  'start_collab_session',
];

export function isAgentAllActionType(value: unknown): value is AgentAllActionType {
  return typeof value === 'string' && AGENT_ALL_ACTION_TYPES.includes(value as AgentAllActionType);
}

export function isAgentActionType(value: unknown): value is AgentActionType {
  return typeof value === 'string' && (
    value === 'create_schedule' ||
    value === 'add_event' ||
    value === 'add_deadline' ||
    value === 'check_progress' ||
    value === 'suggest_review' ||
    value === 'create_document' ||
    value === 'update_document' ||
    value === 'delete_document' ||
    value === 'summarize_doc' ||
    value === 'extract_key_points' ||
    value === 'create_task' ||
    value === 'update_task' ||
    value === 'complete_task' ||
    value === 'set_reminder' ||
    value === 'prioritize_tasks' ||
    value === 'create_room' ||
    value === 'invite_member' ||
    value === 'suggest_edit' ||
    value === 'sync_document' ||
    value === 'start_collab_session' ||
    value === 'delegate_to_agent'
  );
}

export function canAgentPerform(agentId: AgentId, action: AgentAllActionType): boolean {
  return AGENT_ACTION_PERMISSIONS[agentId]?.includes(action) ?? false;
}

export function requiresConfirmation(action: AgentAllActionType): boolean {
  return ACTIONS_REQUIRING_CONFIRMATION.includes(action);
}

export function filterAgentActions<T extends Record<string, unknown>>(
  actions: T[],
  agentId: AgentId,
): T[] {
  return actions.filter((action) => {
    const actionType = action.type as AgentAllActionType;
    return isAgentAllActionType(actionType) && canAgentPerform(agentId, actionType);
  });
}

export interface AgentActionDefinition {
  type: AgentAllActionType;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
}

export const AGENT_ACTION_DEFINITIONS: Record<AgentAllActionType, AgentActionDefinition> = {
  create_schedule: {
    description: 'Create a study schedule based on upcoming deadlines',
    requiredFields: ['startDate', 'endDate', 'subject'],
    optionalFields: ['sessions', 'focusAreas', 'duration'],
  },
  add_event: {
    description: 'Add an event to the calendar',
    requiredFields: ['title', 'date'],
    optionalFields: ['time', 'type', 'subject', 'description'],
  },
  add_deadline: {
    description: 'Add a deadline/assignment',
    requiredFields: ['title', 'dueDate'],
    optionalFields: ['priority', 'subject', 'description'],
  },
  check_progress: {
    description: 'Check study progress and completion status',
    requiredFields: [],
    optionalFields: ['subject', 'timeRange'],
  },
  suggest_review: {
    description: 'Suggest topics to review based on upcoming exams',
    requiredFields: ['examDate'],
    optionalFields: ['subjects'],
  },
  create_document: {
    description: 'Create a new document/notes',
    requiredFields: ['title', 'subjectId'],
    optionalFields: ['content', 'contentFormat'],
  },
  update_document: {
    description: 'Update an existing document',
    requiredFields: ['documentId'],
    optionalFields: ['content', 'title'],
  },
  delete_document: {
    description: 'Delete a document',
    requiredFields: ['documentId'],
    optionalFields: [],
  },
  summarize_doc: {
    description: 'Summarize a document',
    requiredFields: ['documentId'],
    optionalFields: ['maxLength'],
  },
  extract_key_points: {
    description: 'Extract key points from a document',
    requiredFields: ['documentId'],
    optionalFields: ['numPoints'],
  },
  create_task: {
    description: 'Create a new task/todo',
    requiredFields: ['title'],
    optionalFields: ['dueDate', 'priority', 'subject'],
  },
  update_task: {
    description: 'Update a task',
    requiredFields: ['taskId'],
    optionalFields: ['title', 'dueDate', 'priority', 'status'],
  },
  complete_task: {
    description: 'Mark a task as complete',
    requiredFields: ['taskId'],
    optionalFields: [],
  },
  set_reminder: {
    description: 'Set a reminder for a task or event',
    requiredFields: ['title', 'remindAt'],
    optionalFields: ['relatedId', 'relatedType'],
  },
  prioritize_tasks: {
    description: 'Prioritize tasks based on deadlines',
    requiredFields: [],
    optionalFields: ['subject', 'daysAhead'],
  },
  create_room: {
    description: 'Create a new study room',
    requiredFields: ['name'],
    optionalFields: ['description', 'subject', 'isPrivate'],
  },
  invite_member: {
    description: 'Invite a member to a study room',
    requiredFields: ['roomId', 'email'],
    optionalFields: ['role'],
  },
  suggest_edit: {
    description: 'Suggest an edit in a collaborative document',
    requiredFields: ['documentId', 'suggestion'],
    optionalFields: ['position'],
  },
  sync_document: {
    description: 'Sync changes to a collaborative document',
    requiredFields: ['documentId'],
    optionalFields: ['changes'],
  },
  start_collab_session: {
    description: 'Start a collaborative study session',
    requiredFields: ['roomId'],
    optionalFields: ['duration', 'topic'],
  },
  delegate_to_agent: {
    description: 'Delegate a task to another agent',
    requiredFields: ['targetAgent', 'action', 'payload'],
    optionalFields: ['context'],
  },
  navigate_to: {
    description: 'Navigate to a specific page in the app',
    requiredFields: ['page'],
    optionalFields: ['params'],
  },
  show_dashboard: {
    description: 'Show the dashboard',
    requiredFields: [],
    optionalFields: [],
  },
  show_calendar: {
    description: 'Show the calendar',
    requiredFields: [],
    optionalFields: [],
  },
  show_subjects: {
    description: 'Show subjects',
    requiredFields: [],
    optionalFields: [],
  },
  show_quiz: {
    description: 'Show quiz hub',
    requiredFields: [],
    optionalFields: [],
  },
  show_flashcards: {
    description: 'Show flashcards',
    requiredFields: [],
    optionalFields: [],
  },
  show_rooms: {
    description: 'Show study rooms',
    requiredFields: [],
    optionalFields: [],
  },
};

export function validateAgentAction(action: Record<string, unknown>): { valid: boolean; missing: string[]; extra: string[] } {
  const actionType = action.type as AgentAllActionType;
  const definition = AGENT_ACTION_DEFINITIONS[actionType];
  
  if (!definition) {
    return { valid: false, missing: [], extra: [] };
  }
  
  const missing = definition.requiredFields.filter(field => !(field in action));
  const extra = Object.keys(action).filter(field => 
    field !== 'type' && 
    !definition.requiredFields.includes(field) && 
    !definition.optionalFields.includes(field)
  );
  
  return {
    valid: missing.length === 0,
    missing,
    extra,
  };
}
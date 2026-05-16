export type OperationType =
  | 'create_document'
  | 'update_document'
  | 'delete_document'
  | 'update_document_block'
  | 'delete_document_block'
  | 'create_flashcards'
  | 'update_flashcard'
  | 'delete_flashcard'
  | 'create_quiz'
  | 'submit_quiz_answer'
  | 'update_quiz'
  | 'delete_quiz'
  | 'create_study_guide'
  | 'update_study_guide'
  | 'schedule_session'
  | 'add_calendar_event'
  | 'update_calendar_event'
  | 'delete_calendar_event'
  | 'update_assignment_priority'
  | 'create_room'
  | 'update_room'
  | 'delete_room'
  | 'invite_collaborator'
  | 'remove_collaborator'
  | 'store_memory'
  | 'extract_memory'
  | 'update_user_preference';

export interface WorkspaceOperation {
  id: string;
  type: OperationType;
  user_id: string;
  entity_type: string;
  entity_id?: string;
  payload: OperationPayload;
  status: OperationStatus;
  result?: OperationResult;
  error_message?: string;
  rollback_data?: RollbackData;
  parent_operation_id?: string;
  created_at: string;
  completed_at?: string;
}

export type OperationStatus = 'pending' | 'applying' | 'applied' | 'rolled_back' | 'failed';

export interface OperationPayload {
  [key: string]: unknown;
}

export interface OperationResult {
  success: boolean;
  entity_id?: string;
  data?: Record<string, unknown>;
  message?: string;
}

export interface RollbackData {
  previous_state: Record<string, unknown>;
  inverse_operation: OperationType;
}

export interface OperationValidation {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  requires_confirmation: boolean;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

export interface OperationBatch {
  id: string;
  user_id: string;
  operations: WorkspaceOperation[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export interface OperationProgress {
  operation_id: string;
  status: OperationStatus;
  progress: number;
  message?: string;
  result?: OperationResult;
}

export interface ConflictResult {
  has_conflicts: boolean;
  conflicts: OperationConflict[];
}

export interface OperationConflict {
  operation_id: string;
  conflicting_operation_id: string;
  conflict_type: 'write_write' | 'write_delete' | 'invalid_state';
  message: string;
}
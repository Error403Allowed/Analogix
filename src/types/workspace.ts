export type EntityType =
  | 'subject'
  | 'document'
  | 'flashcard_set'
  | 'flashcard'
  | 'quiz'
  | 'question'
  | 'study_guide'
  | 'calendar_event'
  | 'assignment'
  | 'formula'
  | 'resource'
  | 'achievement'
  | 'study_session'
  | 'room'
  | 'collaborator'
  | 'user_memory'
  | 'curriculum_node';

export type RelationshipType =
  | 'generated_from'
  | 'tests'
  | 'triggers'
  | 'belongs_to'
  | 'practiced_in'
  | 'contains'
  | 'linked_to'
  | 'depends_on'
  | 'related_to'
  | 'part_of'
  | 'assigned_to'
  | 'created_by'
  | 'collaborates_with';

export interface WorkspaceEntity {
  id: string;
  entity_type: EntityType;
  workspace_id: string;
  entity_id: string;
  entity_data: Record<string, unknown>;
  metadata: EntityMetadata;
  relationships: EntityRelationship[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface EntityMetadata {
  title: string;
  preview?: string;
  subject_id?: string;
  topic?: string;
  source?: string;
  created_by?: string;
  last_accessed_at?: string;
  permissions?: EntityPermission[];
}

export interface EntityPermission {
  user_id: string;
  permission: 'read' | 'write' | 'admin';
}

export interface EntityRelationship {
  id: string;
  source_type: EntityType;
  source_id: string;
  target_type: EntityType;
  target_id: string;
  relationship_type: RelationshipType;
  metadata?: Record<string, unknown>;
}

export interface WorkspaceContext {
  user_id: string;
  subjects: SubjectContext[];
  documents: DocumentContext[];
  flashcards: FlashcardSetContext[];
  quizzes: QuizContext[];
  calendar_events: CalendarEventContext[];
  recent_activities: ActivityContext[];
  memory: MemoryContext;
  preferences: UserPreferences;
}

export interface SubjectContext {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  grade?: string;
  curriculum_nodes?: string[];
}

export interface DocumentContext {
  id: string;
  subject_id: string;
  title: string;
  type: string;
  preview: string;
  updated_at: string;
  has_related_flashcards?: boolean;
  has_related_quizzes?: boolean;
}

export interface FlashcardSetContext {
  id: string;
  subject_id: string;
  title: string;
  card_count: number;
  due_count: number;
  source_document_id?: string;
}

export interface QuizContext {
  id: string;
  subject_id: string;
  title: string;
  question_count: number;
  difficulty: 'foundational' | 'intermediate' | 'advanced';
  last_score?: number;
}

export interface CalendarEventContext {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  type: string;
  subject?: string;
  linked_assignment_id?: string;
}

export interface ActivityContext {
  type: string;
  entity_type: EntityType;
  entity_id: string;
  timestamp: string;
  summary: string;
}

export interface MemoryContext {
  facts: string[];
  preferences: string[];
  strengths: string[];
  weak_areas: string[];
  study_patterns: StudyPattern[];
}

export interface StudyPattern {
  subject_id: string;
  typical_session_duration: number;
  preferred_time_of_day?: string;
  flashcard_review_rate?: number;
}

export interface UserPreferences {
  grade: string;
  state?: string;
  timezone: string;
  analogy_intensity: number;
  response_length: 'brief' | 'moderate' | 'detailed';
}

export interface RetrievedEntity {
  entity: WorkspaceEntity;
  relevance_score: number;
  highlight?: string;
}
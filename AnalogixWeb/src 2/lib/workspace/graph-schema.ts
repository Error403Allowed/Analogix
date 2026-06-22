import { z } from 'zod';

export const EntityTypeEnum = z.enum([
  'subject',
  'document',
  'flashcard_set',
  'flashcard',
  'quiz',
  'question',
  'study_guide',
  'calendar_event',
  'assignment',
  'formula',
  'resource',
  'achievement',
  'study_session',
  'room',
  'collaborator',
  'user_memory',
  'curriculum_node',
]);

export type EntityType = z.infer<typeof EntityTypeEnum>;

export const RelationshipTypeEnum = z.enum([
  'generated_from',
  'tests',
  'triggers',
  'belongs_to',
  'practiced_in',
  'contains',
  'linked_to',
  'depends_on',
  'related_to',
  'part_of',
  'assigned_to',
  'created_by',
  'collaborates_with',
]);

export type RelationshipType = z.infer<typeof RelationshipTypeEnum>;

export const EntityMetadataSchema = z.object({
  title: z.string(),
  preview: z.string().optional(),
  subject_id: z.string().optional(),
  topic: z.string().optional(),
  source: z.string().optional(),
  created_by: z.string().optional(),
  last_accessed_at: z.string().optional(),
  permissions: z.array(z.object({
    user_id: z.string(),
    permission: z.enum(['read', 'write', 'admin']),
  })).optional(),
});

export type EntityMetadata = z.infer<typeof EntityMetadataSchema>;

export const EntityRelationshipSchema = z.object({
  id: z.string().optional(),
  source_type: EntityTypeEnum,
  source_id: z.string(),
  target_type: EntityTypeEnum,
  target_id: z.string(),
  relationship_type: RelationshipTypeEnum,
  metadata: z.record(z.unknown()).optional(),
});

export type EntityRelationship = z.infer<typeof EntityRelationshipSchema>;

export const WorkspaceEntitySchema = z.object({
  id: z.string().uuid(),
  entity_type: EntityTypeEnum,
  workspace_id: z.string().uuid(),
  entity_id: z.string(),
  entity_data: z.record(z.unknown()),
  metadata: EntityMetadataSchema,
  relationships: z.array(EntityRelationshipSchema),
  tags: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});

export type WorkspaceEntity = z.infer<typeof WorkspaceEntitySchema>;

export const RelationshipQuerySchema = z.object({
  source_type: EntityTypeEnum.optional(),
  source_id: z.string().optional(),
  target_type: EntityTypeEnum.optional(),
  target_id: z.string().optional(),
  relationship_type: RelationshipTypeEnum.optional(),
});

export type RelationshipQuery = z.infer<typeof RelationshipQuerySchema>;

export const EntitySearchQuerySchema = z.object({
  entity_type: EntityTypeEnum.optional(),
  subject_id: z.string().optional(),
  topic: z.string().optional(),
  tags: z.array(z.string()).optional(),
  query: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type EntitySearchQuery = z.infer<typeof EntitySearchQuerySchema>;

export const GraphTraversalQuerySchema = z.object({
  start_entity_type: EntityTypeEnum,
  start_entity_id: z.string(),
  relationship_type: RelationshipTypeEnum,
  max_depth: z.number().min(1).max(5).default(3),
  target_types: z.array(EntityTypeEnum).optional(),
});

export type GraphTraversalQuery = z.infer<typeof GraphTraversalQuerySchema>;

export const GraphPathSchema = z.object({
  entities: z.array(WorkspaceEntitySchema),
  relationships: z.array(EntityRelationshipSchema),
  total_depth: z.number(),
});

export type GraphPath = z.infer<typeof GraphPathSchema>;

export const RelatedEntitiesQuerySchema = z.object({
  entity_type: EntityTypeEnum,
  entity_id: z.string(),
  relationship_types: z.array(RelationshipTypeEnum).optional(),
  max_results: z.number().min(1).max(50).default(10),
});

export type RelatedEntitiesQuery = z.infer<typeof RelatedEntitiesQuerySchema>;
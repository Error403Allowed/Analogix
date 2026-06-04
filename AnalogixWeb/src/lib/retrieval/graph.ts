import { createToolsClient } from '@/lib/supabase/tools-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EntityType, RelationshipType } from '@/types/workspace';

export interface GraphTraversalOptions {
  startEntityType: EntityType;
  startEntityId: string;
  relationshipType: RelationshipType;
  maxDepth?: number;
  targetTypes?: EntityType[];
}

export interface GraphNode {
  id: string;
  entityType: EntityType;
  data: Record<string, unknown>;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  relationshipType: RelationshipType;
}

export interface GraphTraversalResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  depth: number;
}

export async function traverseGraph(
  userId: string,
  options: GraphTraversalOptions
): Promise<GraphTraversalResult> {
  const { startEntityType, startEntityId, relationshipType, maxDepth = 3, targetTypes } = options;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const visited = new Set<string>();

  const supabase = createToolsClient();

  async function traverse(type: EntityType, id: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    const key = `${type}:${id}`;
    if (visited.has(key)) return;
    visited.add(key);

    const nodeData = await fetchEntityData(type, id, userId, supabase);
    if (nodeData) {
      nodes.push({ id, entityType: type, data: nodeData });
    }

    const relationships = await fetchRelationships(type, id, relationshipType, supabase);

    for (const rel of relationships) {
      edges.push({
        sourceId: id,
        targetId: rel.target_id,
        relationshipType: rel.relationship_type as RelationshipType,
      });

      if (targetTypes && !targetTypes.includes(rel.target_type as EntityType)) {
        continue;
      }

      await traverse(rel.target_type as EntityType, rel.target_id, depth + 1);
    }
  }

  await traverse(startEntityType, startEntityId, 0);

  return { nodes, edges, depth: maxDepth };
}

async function fetchEntityData(
  type: EntityType,
  id: string,
  userId: string,
  supabase: SupabaseClient
): Promise<Record<string, unknown> | null> {
  const tableMap: Record<EntityType, string> = {
    document: 'documents',
    flashcard_set: 'documents',
    flashcard: 'documents',
    quiz: 'documents',
    question: 'documents',
    study_guide: 'documents',
    calendar_event: 'events',
    assignment: 'deadlines',
    formula: 'documents',
    resource: 'documents',
    achievement: 'achievements',
    study_session: 'study_sessions',
    room: 'rooms',
    collaborator: 'room_members',
    user_memory: 'ai_memory_fragments',
    curriculum_node: 'curriculum_nodes',
    subject: 'subject_data',
  };

  const table = tableMap[type];
  if (!table) return null;

  const columnMap: Record<EntityType, string> = {
    document: 'owner_user_id',
    flashcard_set: 'owner_user_id',
    flashcard: 'owner_user_id',
    quiz: 'owner_user_id',
    question: 'owner_user_id',
    study_guide: 'owner_user_id',
    calendar_event: 'user_id',
    assignment: 'user_id',
    formula: 'owner_user_id',
    resource: 'owner_user_id',
    achievement: 'user_id',
    study_session: 'user_id',
    room: 'host_id',
    collaborator: 'user_id',
    user_memory: 'user_id',
    curriculum_node: 'user_id',
    subject: 'user_id',
  };

  const idColumn = type === 'room' ? 'id' : 'id';

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq(idColumn, id)
    .eq(columnMap[type], userId)
    .single();

  if (error) return null;
  return data;
}

async function fetchRelationships(
  sourceType: EntityType,
  sourceId: string,
  relationshipType: RelationshipType,
  supabase: SupabaseClient
): Promise<Array<{ target_type: string; target_id: string; relationship_type: string }>> {
  const { data, error } = await supabase
    .from('entity_relationships')
    .select('target_type, target_id, relationship_type')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .eq('relationship_type', relationshipType);

  if (error) return [];
  return data || [];
}

export async function getRelatedEntities(
  userId: string,
  sourceType: EntityType,
  sourceId: string,
  relationshipTypes?: RelationshipType[]
): Promise<{ type: EntityType; id: string; data: Record<string, unknown> }[]> {
  const supabase = createToolsClient();

  let query = supabase
    .from('entity_relationships')
    .select('target_type, target_id, relationship_type')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);

  if (relationshipTypes && relationshipTypes.length > 0) {
    query = query.in('relationship_type', relationshipTypes);
  }

  const { data: relationships, error } = await query as { data: Array<{ target_id: string; target_type: string; relationship_type: string }> | null; error: unknown };

  if (error || !relationships || relationships.length === 0) {
    return [];
  }

  const targetIds = relationships.map(r => r.target_id);
  const targetTypes = [...new Set(relationships.map(r => r.target_type))];

  const results: { type: EntityType; id: string; data: Record<string, unknown> }[] = [];

  for (const targetType of targetTypes) {
    const typeIds = relationships.filter(r => r.target_type === targetType).map(r => r.target_id);

    const tableMap: Record<string, string> = {
      document: 'documents',
      flashcard_set: 'documents',
      quiz: 'documents',
      study_guide: 'documents',
      calendar_event: 'events',
    };

    const table = tableMap[targetType];
    if (!table) continue;

    const { data: entities } = await supabase
      .from(table)
      .select('*')
      .in('id', typeIds) as { data: Array<Record<string, unknown>> | null; error: unknown };

    if (entities) {
      for (const entity of entities) {
        results.push({
          type: targetType as EntityType,
          id: entity.id as string,
          data: entity,
        });
      }
    }
  }

  return results;
}
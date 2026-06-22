import { createClient } from '@supabase/supabase-js';
import {
  WorkspaceEntitySchema,
  EntityRelationshipSchema,
  EntitySearchQuerySchema,
  RelationshipQuerySchema,
  GraphTraversalQuerySchema,
  GraphPathSchema,
  RelatedEntitiesQuerySchema,
  type WorkspaceEntity,
  type EntityRelationship,
  type EntitySearchQuery,
  type RelationshipQuery,
  type GraphTraversalQuery,
  type GraphPath,
  type RelatedEntitiesQuery,
  EntityTypeEnum,
  RelationshipTypeEnum,
} from './graph-schema';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const workspaceSupabase = createClient(supabaseUrl, supabaseAnonKey);

export class WorkspaceGraphClient {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async createEntity(entity: Omit<WorkspaceEntity, 'id' | 'created_at' | 'updated_at'>): Promise<WorkspaceEntity> {
    const { data, error } = await workspaceSupabase
      .from('workspace_entities')
      .insert({
        entity_type: entity.entity_type,
        workspace_id: entity.workspace_id,
        entity_id: entity.entity_id,
        entity_data: entity.entity_data,
        metadata: entity.metadata,
        relationships: entity.relationships,
        tags: entity.tags,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create entity: ${error.message}`);
    return WorkspaceEntitySchema.parse(data);
  }

  async updateEntity(
    entityId: string,
    updates: Partial<Pick<WorkspaceEntity, 'entity_data' | 'metadata' | 'relationships' | 'tags'>>
  ): Promise<WorkspaceEntity> {
    const { data, error } = await workspaceSupabase
      .from('workspace_entities')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entityId)
      .eq('workspace_id', this.userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update entity: ${error.message}`);
    return WorkspaceEntitySchema.parse(data);
  }

  async deleteEntity(entityId: string): Promise<void> {
    const { error } = await workspaceSupabase
      .from('workspace_entities')
      .delete()
      .eq('id', entityId)
      .eq('workspace_id', this.userId);

    if (error) throw new Error(`Failed to delete entity: ${error.message}`);
  }

  async getEntity(entityId: string): Promise<WorkspaceEntity | null> {
    const { data, error } = await workspaceSupabase
      .from('workspace_entities')
      .select('*')
      .eq('id', entityId)
      .eq('workspace_id', this.userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get entity: ${error.message}`);
    }
    return WorkspaceEntitySchema.parse(data);
  }

  async searchEntities(query: EntitySearchQuery): Promise<WorkspaceEntity[]> {
    let dbQuery = workspaceSupabase
      .from('workspace_entities')
      .select('*')
      .eq('workspace_id', this.userId);

    if (query.entity_type) {
      dbQuery = dbQuery.eq('entity_type', query.entity_type);
    }

    if (query.subject_id) {
      dbQuery = dbQuery.contains('metadata', { subject_id: query.subject_id });
    }

    if (query.topic) {
      dbQuery = dbQuery.contains('metadata', { topic: query.topic });
    }

    if (query.tags && query.tags.length > 0) {
      dbQuery = dbQuery.contains('tags', query.tags);
    }

    if (query.query) {
      dbQuery = dbQuery.textSearch('metadata->title', query.query, {
        type: 'websearch',
        config: 'english',
      });
    }

    const { data, error } = await dbQuery
      .range(query.offset, query.offset + query.limit - 1)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to search entities: ${error.message}`);
    return data.map(e => WorkspaceEntitySchema.parse(e));
  }

  async getEntitiesByType(entityType: string, limit = 50): Promise<WorkspaceEntity[]> {
    const { data, error } = await workspaceSupabase
      .from('workspace_entities')
      .select('*')
      .eq('workspace_id', this.userId)
      .eq('entity_type', entityType)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get entities by type: ${error.message}`);
    return data.map(e => WorkspaceEntitySchema.parse(e));
  }

  async createRelationship(relationship: Omit<EntityRelationship, 'id'>): Promise<EntityRelationship> {
    const { data, error } = await workspaceSupabase
      .from('entity_relationships')
      .insert({
        workspace_id: this.userId,
        source_type: relationship.source_type,
        source_id: relationship.source_id,
        target_type: relationship.target_type,
        target_id: relationship.target_id,
        relationship_type: relationship.relationship_type,
        metadata: relationship.metadata || {},
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create relationship: ${error.message}`);
    return EntityRelationshipSchema.parse(data);
  }

  async getRelationships(query: RelationshipQuery): Promise<EntityRelationship[]> {
    let dbQuery = workspaceSupabase
      .from('entity_relationships')
      .select('*')
      .eq('workspace_id', this.userId);

    if (query.source_type && query.source_id) {
      dbQuery = dbQuery.eq('source_type', query.source_type).eq('source_id', query.source_id);
    }

    if (query.target_type && query.target_id) {
      dbQuery = dbQuery.eq('target_type', query.target_type).eq('target_id', query.target_id);
    }

    if (query.relationship_type) {
      dbQuery = dbQuery.eq('relationship_type', query.relationship_type);
    }

    const { data, error } = await dbQuery;

    if (error) throw new Error(`Failed to get relationships: ${error.message}`);
    return data.map(r => EntityRelationshipSchema.parse(r));
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    const { error } = await workspaceSupabase
      .from('entity_relationships')
      .delete()
      .eq('id', relationshipId)
      .eq('workspace_id', this.userId);

    if (error) throw new Error(`Failed to delete relationship: ${error.message}`);
  }

  async getRelatedEntities(query: RelatedEntitiesQuery): Promise<WorkspaceEntity[]> {
    const relationships = await this.getRelationships({
      source_type: query.entity_type,
      source_id: query.entity_id,
    });

    const filteredRelationships = query.relationship_types
      ? relationships.filter(r => query.relationship_types!.includes(r.relationship_type))
      : relationships;

    const targetIds = filteredRelationships.map(r => r.target_id);
    if (targetIds.length === 0) return [];

    const { data, error } = await workspaceSupabase
      .from('workspace_entities')
      .select('*')
      .in('id', targetIds)
      .limit(query.max_results);

    if (error) throw new Error(`Failed to get related entities: ${error.message}`);
    return data.map(e => WorkspaceEntitySchema.parse(e));
  }

  async traverseGraph(query: GraphTraversalQuery): Promise<GraphPath> {
    const visited = new Set<string>();
    const entities: WorkspaceEntity[] = [];
    const relationships: EntityRelationship[] = [];

    const traverse = async (type: string, id: string, depth: number) => {
      if (depth > query.max_depth) return;
      const key = `${type}:${id}`;
      if (visited.has(key)) return;
      visited.add(key);

      const entity = await this.getEntity(id);
      if (entity) {
        entities.push(entity);
      }

      const rels = await this.getRelationships({
        source_type: query.start_entity_type as any,
        source_id: id,
        relationship_type: query.relationship_type as any,
      });

      for (const rel of rels) {
        relationships.push(rel);

        if (query.target_types && !query.target_types.includes(rel.target_type as any)) {
          continue;
        }

        await traverse(rel.target_type, rel.target_id, depth + 1);
      }
    };

    await traverse(query.start_entity_type, query.start_entity_id, 0);

    return GraphPathSchema.parse({
      entities,
      relationships,
      total_depth: query.max_depth,
    });
  }

  async getDocumentRelationships(documentId: string): Promise<{
    flashcards: WorkspaceEntity[];
    quizzes: WorkspaceEntity[];
    studyGuides: WorkspaceEntity[];
  }> {
    const [flashcards, quizzes, studyGuides] = await Promise.all([
      this.getRelatedEntities({
        entity_type: 'document',
        entity_id: documentId,
        relationship_types: ['generated_from'],
        max_results: 20,
      }),
      this.getRelatedEntities({
        entity_type: 'document',
        entity_id: documentId,
        relationship_types: ['tests'],
        max_results: 10,
      }),
      this.getRelatedEntities({
        entity_type: 'document',
        entity_id: documentId,
        relationship_types: ['related_to'],
        max_results: 10,
      }),
    ]);

    return {
      flashcards: flashcards.filter(e => e.entity_type === 'flashcard_set'),
      quizzes: quizzes.filter(e => e.entity_type === 'quiz'),
      studyGuides: studyGuides.filter(e => e.entity_type === 'study_guide'),
    };
  }
}

export function createGraphClient(userId: string): WorkspaceGraphClient {
  return new WorkspaceGraphClient(userId);
}
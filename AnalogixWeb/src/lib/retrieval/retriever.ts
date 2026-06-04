import { fullTextSearch, type FullTextSearchOptions } from './fulltext';
import { filterByMetadata, getSubjects, type MetadataFilterOptions, type MetadataFilterResult } from './metadata';
import { traverseGraph, getRelatedEntities, type GraphTraversalOptions } from './graph';
import { createToolsClient } from '@/lib/supabase/tools-client';
import type { EntityType, RelationshipType, RetrievedEntity, WorkspaceContext, DocumentContext } from '@/types/workspace';

interface EntityData {
  content?: string;
  [key: string]: unknown;
}

export interface RetrievalScope {
  type: 'documents' | 'flashcards' | 'quizzes' | 'formulas' | 'calendar' | 'memory' | 'curriculum' | 'rooms' | 'subjects';
  maxResults?: number;
}

export interface RetrievalRequest {
  userId: string;
  query?: string;
  scopes: RetrievalScope[];
  subjectId?: string;
  topic?: string;
  tags?: string[];
  maxTotalTokens?: number;
}

export interface RetrievalResult {
  entities: RetrievedEntity[];
  totalTokens: number;
  strategyUsed: 'fulltext' | 'metadata' | 'graph' | 'hybrid';
  scopes: Record<string, RetrievedEntity[]>;
}

const TOKEN_ESTIMATE = 4;

export class WorkspaceRetriever {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async retrieve(request: RetrievalRequest): Promise<RetrievalResult> {
    const { query, scopes, subjectId, topic, tags, maxTotalTokens = 4000 } = request;

    const scopesResult: Record<string, RetrievedEntity[]> = {};
    let totalTokens = 0;
    const strategyUsed: 'fulltext' | 'metadata' | 'graph' | 'hybrid' = 'metadata';

    for (const scope of scopes) {
      const scopeEntities = await this.retrieveScope(scope, {
        query,
        subjectId,
        topic,
        tags,
      });

      scopesResult[scope.type] = scopeEntities;
      totalTokens += scopeEntities.reduce((sum, e) => sum + (String((e.entity.entity_data as EntityData)?.content || '').length || 0) / TOKEN_ESTIMATE, 0);

      if (totalTokens > maxTotalTokens) {
        scopesResult[scope.type] = this.truncateResults(scopeEntities, maxTotalTokens - totalTokens);
        break;
      }
    }

    const allEntities = Object.values(scopesResult).flat();

    return {
      entities: allEntities,
      totalTokens,
      strategyUsed: query ? 'fulltext' : strategyUsed,
      scopes: scopesResult,
    };
  }

  private async retrieveScope(
    scope: RetrievalScope,
    options: { query?: string; subjectId?: string; topic?: string; tags?: string[] }
  ): Promise<RetrievedEntity[]> {
    const maxResults = scope.maxResults || 10;

    switch (scope.type) {
      case 'documents':
        return this.retrieveDocuments(options, maxResults);
      case 'flashcards':
        return this.retrieveFlashcards(options, maxResults);
      case 'quizzes':
        return this.retrieveQuizzes(options, maxResults);
      case 'formulas':
        return this.retrieveFormulas(options, maxResults);
      case 'calendar':
        return this.retrieveCalendarEvents(options, maxResults);
      case 'subjects':
        return this.retrieveSubjects(maxResults);
      case 'memory':
        return this.retrieveMemory(options, maxResults);
      default:
        return [];
    }
  }

  private async retrieveDocuments(options: { query?: string; subjectId?: string }, limit: number): Promise<RetrievedEntity[]> {
    if (options.query) {
      const results = await fullTextSearch(this.userId, {
        query: options.query,
        subjectId: options.subjectId,
        limit,
      });
      return results.map(r => ({
        entity: {
          id: r.entity_id,
          entity_type: 'document' as EntityType,
          workspace_id: this.userId,
          entity_id: r.entity_id,
          entity_data: { title: r.title, content: r.preview },
          metadata: { title: r.title, preview: r.preview, subject_id: r.subject_id },
          relationships: [],
          tags: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        relevance_score: r.relevance_score,
        highlight: r.preview,
      }));
    }

    const filterResult = await filterByMetadata(this.userId, {
      subjectId: options.subjectId,
      entityTypes: ['document', 'study_guide'],
      limit,
    });

    return filterResult.documents.map((d: DocumentContext) => ({
      entity: {
        id: d.id,
        entity_type: 'document' as EntityType,
        workspace_id: this.userId,
        entity_id: d.id,
        entity_data: { title: d.title, content: d.preview },
        metadata: { title: d.title, subject_id: d.subject_id },
        relationships: [],
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      relevance_score: 1,
    }));
  }

  private async retrieveFlashcards(options: { subjectId?: string }, limit: number): Promise<RetrievedEntity[]> {
    const filterResult = await filterByMetadata(this.userId, {
      subjectId: options.subjectId,
      entityTypes: ['flashcard_set'],
      limit,
    });

    return filterResult.flashcards.map(f => ({
      entity: {
        id: f.id,
        entity_type: 'flashcard_set' as EntityType,
        workspace_id: this.userId,
        entity_id: f.id,
        entity_data: { title: f.title, card_count: f.card_count },
        metadata: { title: f.title, subject_id: f.subject_id },
        relationships: [],
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      relevance_score: 1,
    }));
  }

  private async retrieveQuizzes(options: { subjectId?: string }, limit: number): Promise<RetrievedEntity[]> {
    const filterResult = await filterByMetadata(this.userId, {
      subjectId: options.subjectId,
      entityTypes: ['quiz'],
      limit,
    });

    return filterResult.quizzes.map(q => ({
      entity: {
        id: q.id,
        entity_type: 'quiz' as EntityType,
        workspace_id: this.userId,
        entity_id: q.id,
        entity_data: { title: q.title, question_count: q.question_count, difficulty: q.difficulty },
        metadata: { title: q.title, subject_id: q.subject_id },
        relationships: [],
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      relevance_score: 1,
    }));
  }

  private async retrieveFormulas(options: { subjectId?: string }, limit: number): Promise<RetrievedEntity[]> {
    const filterResult = await filterByMetadata(this.userId, {
      subjectId: options.subjectId,
      entityTypes: ['formula'],
      limit,
    });

    return filterResult.formulas.map(f => ({
      entity: {
        id: f.id,
        entity_type: 'formula' as EntityType,
        workspace_id: this.userId,
        entity_id: f.id,
        entity_data: { title: f.title, content: f.preview },
        metadata: { title: f.title, subject_id: f.subject_id },
        relationships: [],
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: f.updated_at || new Date().toISOString(),
      },
      relevance_score: 1,
    }));
  }

  private async retrieveCalendarEvents(options: { subjectId?: string }, limit: number): Promise<RetrievedEntity[]> {
    const filterResult = await filterByMetadata(this.userId, {
      subjectId: options.subjectId,
      entityTypes: ['calendar_event'],
      limit,
    });

    return filterResult.calendarEvents.map(e => ({
      entity: {
        id: e.id,
        entity_type: 'calendar_event' as EntityType,
        workspace_id: this.userId,
        entity_id: e.id,
        entity_data: { title: e.title, start_date: e.start_date, end_date: e.end_date, type: e.type },
        metadata: { title: e.title, subject_id: e.subject },
        relationships: [],
        tags: [],
        created_at: e.start_date,
        updated_at: e.start_date,
      },
      relevance_score: 1,
    }));
  }

  private async retrieveSubjects(limit: number): Promise<RetrievedEntity[]> {
    const subjects = await getSubjects(this.userId);

    return subjects.slice(0, limit).map(s => ({
      entity: {
        id: s.id,
        entity_type: 'subject' as EntityType,
        workspace_id: this.userId,
        entity_id: s.id,
        entity_data: { name: s.name },
        metadata: { title: s.name },
        relationships: [],
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      relevance_score: 1,
    }));
  }

  private async retrieveMemory(options: { query?: string }, limit: number): Promise<RetrievedEntity[]> {
    const supabase = createToolsClient();

    const { data: memories } = await supabase
      .from('ai_memory_fragments')
      .select('*')
      .eq('user_id', this.userId)
      .gte('importance', 0.5)
      .order('created_at', { ascending: false })
      .limit(limit) as { data: Array<{
        id: string;
        content: string;
        memory_type: string;
        importance: number;
        created_at: string;
      }> | null; error: unknown };

    if (!memories) return [];

    return memories.map(m => ({
      entity: {
        id: m.id,
        entity_type: 'user_memory' as EntityType,
        workspace_id: this.userId,
        entity_id: m.id,
        entity_data: { content: m.content, memory_type: m.memory_type },
        metadata: { title: m.memory_type },
        relationships: [],
        tags: [],
        created_at: m.created_at,
        updated_at: m.created_at,
      },
      relevance_score: m.importance || 0.5,
    }));
  }

  private truncateResults(entities: RetrievedEntity[], maxTokens: number): RetrievedEntity[] {
    let tokens = 0;
    const result: RetrievedEntity[] = [];

    for (const entity of entities) {
      const entityTokens = (String((entity.entity.entity_data as EntityData)?.content || '').length || 0) / TOKEN_ESTIMATE;
      if (tokens + entityTokens > maxTokens) break;
      tokens += entityTokens;
      result.push(entity);
    }

    return result;
  }

  async getRelatedFromDocument(documentId: string): Promise<{
    flashcards: RetrievedEntity[];
    quizzes: RetrievedEntity[];
    studyGuides: RetrievedEntity[];
  }> {
    const related = await getRelatedEntities(this.userId, 'document', documentId, ['generated_from', 'tests', 'related_to']);

    const flashcards = related.filter(r => r.type === 'flashcard_set').map(r => ({
      entity: {
        id: r.id,
        entity_type: 'flashcard_set' as EntityType,
        workspace_id: this.userId,
        entity_id: r.id,
        entity_data: r.data,
        metadata: { title: r.data.title as string },
        relationships: [],
        tags: [],
        created_at: '',
        updated_at: '',
      },
      relevance_score: 1,
    }));

    const quizzes = related.filter(r => r.type === 'quiz').map(r => ({
      entity: {
        id: r.id,
        entity_type: 'quiz' as EntityType,
        workspace_id: this.userId,
        entity_id: r.id,
        entity_data: r.data,
        metadata: { title: r.data.title as string },
        relationships: [],
        tags: [],
        created_at: '',
        updated_at: '',
      },
      relevance_score: 1,
    }));

    const studyGuides = related.filter(r => r.type === 'study_guide').map(r => ({
      entity: {
        id: r.id,
        entity_type: 'study_guide' as EntityType,
        workspace_id: this.userId,
        entity_id: r.id,
        entity_data: r.data,
        metadata: { title: r.data.title as string },
        relationships: [],
        tags: [],
        created_at: '',
        updated_at: '',
      },
      relevance_score: 1,
    }));

    return { flashcards, quizzes, studyGuides };
  }
}

export function createRetriever(userId: string): WorkspaceRetriever {
  return new WorkspaceRetriever(userId);
}
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceRetriever, createRetriever } from '@/lib/retrieval/retriever';

const searchEntitiesMock = vi.fn();

vi.mock('@/lib/rag/indexer', () => ({
  searchEntities: (...args: unknown[]) => searchEntitiesMock(...args),
}));

vi.mock('@/lib/supabase/tools-client', () => ({
  createToolsClient: () => {
    const makeChain = (result: any) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        order: () => chain,
        limit: () => chain,
        range: () => chain,
        textSearch: () => chain,
        then: (resolve: (v: any) => void) => resolve(result),
      };
      return chain;
    };
    return {
      from: () => makeChain({ data: [], error: null }),
      rpc: () => Promise.resolve({ data: [], error: null }),
    };
  },
}));

describe('WorkspaceRetriever semantic scopes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchEntitiesMock.mockResolvedValue([]);
  });

  it('searches flashcards via vector search when a query is present', async () => {
    searchEntitiesMock.mockResolvedValue([{
      id: 'row_1',
      entityType: 'flashcard',
      entityId: 'set_9',
      subjectId: 'biology',
      title: 'Photosynthesis',
      content: 'Q: What makes leaves green?\nA: Chlorophyll',
      score: 0.92,
      metadata: {},
    }]);

    const retriever = createRetriever('user_1');
    const result = await retriever.retrieve({
      userId: 'user_1',
      query: 'what makes leaves green?',
      scopes: [{ type: 'flashcards', maxResults: 5 }],
    });

    expect(searchEntitiesMock).toHaveBeenCalledWith('what makes leaves green?', 'user_1', {
      entityTypes: ['flashcard'],
      subjectId: undefined,
      limit: 5,
    });
    expect(result.scopes.flashcards).toHaveLength(1);
    expect(result.scopes.flashcards[0].entity.entity_type).toBe('flashcard_set');
    expect(result.scopes.flashcards[0].entity.entity_data.title).toBe('Photosynthesis');
  });

  it('searches quizzes and calendar via vector search with entity filters', async () => {
    const retriever = createRetriever('user_1');
    searchEntitiesMock.mockResolvedValueOnce([{
      id: 'r1', entityType: 'quiz', entityId: 'q1', subjectId: 'maths',
      title: 'Vectors', content: 'Vectors quiz', score: 0.8, metadata: {},
    }]).mockResolvedValueOnce([{
      id: 'r2', entityType: 'calendar', entityId: 'e1', subjectId: 'maths',
      title: 'Exam', content: 'Final exam', score: 0.85, metadata: {},
    }]);

    const result = await retriever.retrieve({
      userId: 'user_1',
      query: 'when is my exam',
      scopes: [{ type: 'quizzes', maxResults: 3 }, { type: 'calendar', maxResults: 3 }],
    });

    expect(searchEntitiesMock).toHaveBeenNthCalledWith(1, 'when is my exam', 'user_1', {
      entityTypes: ['quiz'], subjectId: undefined, limit: 3,
    });
    expect(searchEntitiesMock).toHaveBeenNthCalledWith(2, 'when is my exam', 'user_1', {
      entityTypes: ['calendar'], subjectId: undefined, limit: 3,
    });
    expect(result.scopes.quizzes[0].entity.entity_type).toBe('quiz');
    expect(result.scopes.calendar[0].entity.entity_type).toBe('calendar_event');
  });

  it('searches formulas against the shared corpus (owner null)', async () => {
    searchEntitiesMock.mockResolvedValue([{
      id: 'r1', entityType: 'formula', entityId: 'quadratic', subjectId: 'maths',
      title: 'Quadratic Formula', content: 'x = (-b ± sqrt(b² - 4ac)) / 2a', score: 0.9, metadata: {},
    }]);

    const retriever = createRetriever('user_1');
    const result = await retriever.retrieve({
      userId: 'user_1',
      query: 'how do I solve a quadratic?',
      scopes: [{ type: 'formulas', maxResults: 3 }],
    });

    expect(searchEntitiesMock).toHaveBeenCalledWith('how do I solve a quadratic?', null, {
      entityTypes: ['formula'], subjectId: undefined, limit: 3,
    });
    expect(result.scopes.formulas).toHaveLength(1);
    expect(result.scopes.formulas[0].entity.entity_type).toBe('formula');
  });

  it('searches subjects and memory via vector search', async () => {
    const retriever = createRetriever('user_1');
    searchEntitiesMock.mockResolvedValueOnce([{
      id: 'r1', entityType: 'subject', entityId: 'biology', subjectId: 'biology',
      title: 'Biology', content: 'Cells and genetics', score: 0.75, metadata: {},
    }]).mockResolvedValueOnce([{
      id: 'r2', entityType: 'memory', entityId: 'mem_1', subjectId: '',
      title: 'fact', content: 'Student struggles with mitosis', score: 0.7,
      metadata: { memory_type: 'weakness' },
    }]);

    const result = await retriever.retrieve({
      userId: 'user_1',
      query: 'what do I struggle with?',
      scopes: [{ type: 'subjects', maxResults: 3 }, { type: 'memory', maxResults: 3 }],
    });

    expect(searchEntitiesMock).toHaveBeenNthCalledWith(1, 'what do I struggle with?', 'user_1', {
      entityTypes: ['subject'], limit: 3,
    });
    expect(searchEntitiesMock).toHaveBeenNthCalledWith(2, 'what do I struggle with?', 'user_1', {
      entityTypes: ['memory'], limit: 3,
    });
    expect(result.scopes.subjects[0].entity.entity_type).toBe('subject');
    expect(result.scopes.memory[0].entity.entity_data.memory_type).toBe('weakness');
  });

  it('falls back to metadata filtering when vector search returns nothing', async () => {
    searchEntitiesMock.mockResolvedValue([]);
    const retriever = createRetriever('user_1');
    const result = await retriever.retrieve({
      userId: 'user_1',
      query: 'show my documents',
      scopes: [{ type: 'documents', maxResults: 5 }],
      subjectId: 'maths',
    });

    expect(result.scopes.documents).toBeDefined();
  });

  it('returns empty for scopes when no query and no metadata fallback', async () => {
    const retriever = createRetriever('user_1');
    const result = await retriever.retrieve({
      userId: 'user_1',
      query: '',
      scopes: [{ type: 'quizzes', maxResults: 3 }],
    });
    expect(result.scopes.quizzes).toEqual([]);
  });
});
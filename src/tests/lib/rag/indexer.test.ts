import { describe, it, expect, vi, beforeEach } from 'vitest';
import { indexEntity, unindexEntity, indexEntities, searchEntities } from '@/lib/rag/indexer';

const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
const mockUpsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockRpc = vi.fn();

const mockClient = {
  from: vi.fn((table: string) => {
    if (table === 'entity_embeddings') {
      return {
        upsert: mockUpsert,
        delete: mockDelete,
      };
    }
    if (table === 'documents') {
      const chain = {
        update: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        then: (resolve: (v: any) => void) => resolve(mockUpdateResult),
      };
      return chain;
    }
    return { upsert: mockUpsert };
  }),
  rpc: mockRpc,
};

let mockUpdateResult = { error: null };

vi.mock('@/lib/supabase/service-role-client', () => ({
  createServiceRoleClient: () => mockClient,
}));

vi.mock('@/lib/rag/embedder', () => ({
  generateEmbedding: vi.fn(async () => mockEmbedding),
}));

describe('rag indexer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    mockUpdateResult = { error: null };
    const deleteChain = {
      eq: vi.fn(() => deleteChain),
      then: (resolve: (v: any) => void) => resolve({ error: null }),
    };
    mockDelete.mockReturnValue(deleteChain);
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  describe('indexEntity', () => {
    it('skips empty content', async () => {
      const ok = await indexEntity({
        ownerUserId: 'user_1',
        entityType: 'flashcard',
        entityId: 'set_1',
        content: '   ',
      });
      expect(ok).toBe(true);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('writes non-document entities to entity_embeddings', async () => {
      const ok = await indexEntity({
        ownerUserId: 'user_1',
        entityType: 'flashcard',
        entityId: 'set_1',
        subjectId: 'maths',
        content: 'Q: What is x?\nA: 42',
        metadata: { title: 'Numbers' },
      });
      expect(ok).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_user_id: 'user_1',
          entity_type: 'flashcard',
          entity_id: 'set_1',
          subject_id: 'maths',
          content: 'Q: What is x?\nA: 42',
          metadata: { title: 'Numbers' },
          embedding: expect.stringMatching(/^\[0.1,0.2,0.3,0.4\]$/),
        }),
        { onConflict: 'entity_type,entity_id,owner_user_id' }
      );
    });

    it('allows shared (owner null) rows such as formulas', async () => {
      await indexEntity({
        ownerUserId: null,
        entityType: 'formula',
        entityId: 'quadratic',
        subjectId: 'maths',
        content: 'Quadratic formula solves ax^2 + bx + c',
      });
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ owner_user_id: null, entity_type: 'formula', entity_id: 'quadratic' }),
        expect.anything()
      );
    });

    it('special-cases documents into their own embedding column', async () => {
      const ok = await indexEntity({
        ownerUserId: 'user_1',
        entityType: 'document',
        entityId: 'doc_1',
        subjectId: 'maths',
        content: 'Notes about vectors',
        metadata: { title: 'Vectors' },
      });
      expect(ok).toBe(true);
      expect(mockUpsert).not.toHaveBeenCalled();
      const docChain = (mockClient.from as any).mock.results
        .filter((r: any) => r.value && typeof r.value.update === 'function')
        .map((r: any) => r.value);
      expect(docChain.length).toBeGreaterThan(0);
      const updateCalls = docChain.flatMap((c: any) => c.update.mock.calls);
      expect(updateCalls.some((call: any[]) => typeof call[0]?.embedding === 'string')).toBe(true);
    });

    it('returns false when the embedding fails', async () => {
      const { generateEmbedding } = await import('@/lib/rag/embedder');
      (generateEmbedding as any).mockRejectedValueOnce(new Error('no wasm'));
      const ok = await indexEntity({
        ownerUserId: 'user_1',
        entityType: 'memory',
        entityId: 'mem_1',
        content: 'study tip',
      });
      expect(ok).toBe(false);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  describe('unindexEntity', () => {
    it('deletes from entity_embeddings with owner filter', async () => {
      const ok = await unindexEntity('calendar', 'evt_1', 'user_1');
      expect(ok).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });

    it('clears document embeddings instead of deleting', async () => {
      const ok = await unindexEntity('document', 'doc_1', 'user_1');
      expect(ok).toBe(true);
      expect(mockUpsert).not.toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('indexEntities', () => {
    it('counts indexed vs skipped', async () => {
      const { indexEntities } = await import('@/lib/rag/indexer');
      const result = await indexEntities([
        { ownerUserId: 'u1', entityType: 'memory' as const, entityId: 'a', content: 'x' },
        { ownerUserId: 'u1', entityType: 'memory' as const, entityId: 'b', content: 'y' },
      ]);
      expect(result).toEqual({ indexed: 2, skipped: 0 });
    });
  });

  describe('searchEntities', () => {
    it('returns an empty array without a query', async () => {
      const result = await searchEntities('   ', 'user_1');
      expect(result).toEqual([]);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('calls hybrid_search with owner, subject, and entity filters', async () => {
      mockRpc.mockResolvedValue({
        data: [{
          id: 'row_1',
          content: 'Card about photosynthesis',
          score: 0.87,
          metadata: { entity_type: 'flashcard', entity_id: 'set_9', subject_id: 'biology', title: 'Photosynthesis' },
        }],
        error: null,
      });
      const result = await searchEntities('photosynthesis', 'user_1', {
        entityTypes: ['flashcard'],
        subjectId: 'biology',
        limit: 5,
      });
      expect(mockRpc).toHaveBeenCalledWith('hybrid_search', expect.objectContaining({
        query_table: 'entity_embeddings',
        p_owner_user_id: 'user_1',
        p_subject_id: 'biology',
        p_entity_types: ['flashcard'],
        match_count: 10,
      }));
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        entityType: 'flashcard',
        entityId: 'set_9',
        subjectId: 'biology',
        title: 'Photosynthesis',
        content: 'Card about photosynthesis',
        score: 0.87,
      });
    });

    it('passes null owner for shared corpus searches', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });
      await searchEntities('quadratic', null, { entityTypes: ['formula'] });
      expect(mockRpc).toHaveBeenCalledWith('hybrid_search', expect.objectContaining({
        p_owner_user_id: null,
        p_entity_types: ['formula'],
      }));
    });

    it('filters low-scoring results and caps at the limit', async () => {
      mockRpc.mockResolvedValue({
        data: [
          { id: 'a', content: 'x', score: 0.9, metadata: { entity_type: 'quiz', entity_id: 'q1', subject_id: 'maths', title: 'A' } },
          { id: 'b', content: 'y', score: 0.1, metadata: { entity_type: 'quiz', entity_id: 'q2', subject_id: 'maths', title: 'B' } },
          { id: 'c', content: 'z', score: 0.8, metadata: { entity_type: 'quiz', entity_id: 'q3', subject_id: 'maths', title: 'C' } },
        ],
        error: null,
      });
      const result = await searchEntities('quiz search', 'user_1', { entityTypes: ['quiz'], limit: 2 });
      expect(result.map(r => r.entityId)).toEqual(['q1', 'q3']);
    });
  });
});
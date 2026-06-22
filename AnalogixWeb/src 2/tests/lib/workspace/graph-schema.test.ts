import { describe, it, expect } from 'vitest';
import {
  EntityTypeEnum,
  RelationshipTypeEnum,
  WorkspaceEntitySchema,
  EntityMetadataSchema,
  EntitySearchQuerySchema,
} from '@/lib/workspace/graph-schema';

describe('Workspace Graph Schemas', () => {
  describe('EntityTypeEnum', () => {
    it('should accept valid entity types', () => {
      const validTypes = [
        'subject',
        'document',
        'flashcard_set',
        'quiz',
        'calendar_event',
      ];

      for (const type of validTypes) {
        const result = EntityTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid entity types', () => {
      const result = EntityTypeEnum.safeParse('invalid_type');
      expect(result.success).toBe(false);
    });
  });

  describe('RelationshipTypeEnum', () => {
    it('should accept valid relationship types', () => {
      const validTypes = [
        'generated_from',
        'tests',
        'belongs_to',
        'contains',
      ];

      for (const type of validTypes) {
        const result = RelationshipTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('EntityMetadataSchema', () => {
    it('should parse valid metadata', () => {
      const metadata = {
        title: 'Test Document',
        subject_id: 'maths',
        preview: 'Test preview content',
      };

      const result = EntityMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should accept minimal metadata', () => {
      const metadata = {
        title: 'Minimal Document',
      };

      const result = EntityMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });
  });

  describe('EntitySearchQuerySchema', () => {
    it('should parse valid search queries', () => {
      const query = {
        entity_type: 'document',
        subject_id: 'science',
        query: 'quadratic equations',
        limit: 10,
      };

      const result = EntitySearchQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const query = {
        query: 'test',
      };

      const result = EntitySearchQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(20);
    });

    it('should reject invalid limits', () => {
      const query = {
        query: 'test',
        limit: -1,
      };

      const result = EntitySearchQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });

  describe('WorkspaceEntitySchema', () => {
    it('should parse a complete entity', () => {
      const entity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        entity_type: 'document',
        workspace_id: '123e4567-e89b-12d3-a456-426614174001',
        entity_id: 'doc_123',
        entity_data: { title: 'Test', content: 'Content' },
        metadata: { title: 'Test Document' },
        relationships: [],
        tags: ['math', 'algebra'],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = WorkspaceEntitySchema.safeParse(entity);
      expect(result.success).toBe(true);
    });

    it('should reject entity with invalid UUID', () => {
      const entity = {
        id: 'invalid-uuid',
        entity_type: 'document',
        workspace_id: '123e4567-e89b-12d3-a456-426614174001',
        entity_id: 'doc_123',
        entity_data: {},
        metadata: { title: 'Test' },
        relationships: [],
        tags: [],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = WorkspaceEntitySchema.safeParse(entity);
      expect(result.success).toBe(false);
    });
  });
});
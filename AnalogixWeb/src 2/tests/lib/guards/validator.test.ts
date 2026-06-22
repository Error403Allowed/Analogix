import { describe, it, expect } from 'vitest';
import { createGuardValidator } from '@/lib/guards/validator';
import type { WorkspaceOperation } from '@/types/operations';

describe('Guard Validator', () => {
  const validator = createGuardValidator();

  describe('validate', () => {
    it('should validate a valid create_flashcards operation', () => {
      const operation: WorkspaceOperation = {
        id: 'op_123',
        type: 'create_flashcards',
        user_id: 'user_123',
        entity_type: 'flashcard_set',
        payload: {
          subjectId: 'maths',
          setName: 'Quadratic Equations',
          cards: [
            { front: 'What is x²?', back: 'A variable squared' },
            { front: 'Solve x² = 4', back: 'x = ±2' },
          ],
        },
        status: 'pending',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      const result = validator.validate(operation);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject flashcard operation without subject', () => {
      const operation: WorkspaceOperation = {
        id: 'op_124',
        type: 'create_flashcards',
        user_id: 'user_123',
        entity_type: 'flashcard_set',
        payload: {
          setName: 'Test',
          cards: [{ front: 'Q', back: 'A' }],
        },
        status: 'pending',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      const result = validator.validate(operation);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_SUBJECT')).toBe(true);
    });

    it('should reject flashcard operation with empty cards', () => {
      const operation: WorkspaceOperation = {
        id: 'op_125',
        type: 'create_flashcards',
        user_id: 'user_123',
        entity_type: 'flashcard_set',
        payload: {
          subjectId: 'maths',
          setName: 'Test',
          cards: [],
        },
        status: 'pending',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      const result = validator.validate(operation);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'EMPTY_CARDS')).toBe(true);
    });

    it('should require confirmation for delete operations', () => {
      const operation: WorkspaceOperation = {
        id: 'op_126',
        type: 'delete_document',
        user_id: 'user_123',
        entity_type: 'document',
        entity_id: 'doc_123',
        payload: {},
        status: 'pending',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      const result = validator.validate(operation);
      expect(result.requires_confirmation).toBe(true);
    });

    it('should accept valid store_memory operation', () => {
      const operation: WorkspaceOperation = {
        id: 'op_127',
        type: 'store_memory',
        user_id: 'user_123',
        entity_type: 'user_memory',
        payload: {
          content: 'I prefer visual learning',
          memoryType: 'preference',
          importance: 0.8,
        },
        status: 'pending',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      const result = validator.validate(operation);
      expect(result.valid).toBe(true);
    });

    it('should reject memory with content exceeding limit', () => {
      const longContent = 'a'.repeat(2001);
      
      const operation: WorkspaceOperation = {
        id: 'op_128',
        type: 'store_memory',
        user_id: 'user_123',
        entity_type: 'user_memory',
        payload: {
          content: longContent,
          memoryType: 'fact',
        },
        status: 'pending',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      const result = validator.validate(operation);
      expect(result.valid).toBe(false);
    });

    it('should reject operation with missing type', () => {
      const operation: WorkspaceOperation = {
        id: 'op_129',
        type: '' as any,
        user_id: 'user_123',
        entity_type: 'document',
        payload: {},
        status: 'pending',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      const result = validator.validate(operation);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_TYPE')).toBe(true);
    });
  });
});
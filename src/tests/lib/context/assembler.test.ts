import { describe, it, expect } from 'vitest';
import { createContextAssembler } from '@/lib/context/assembler';
import type { RetrievedEntity } from '@/types/workspace';
import type { MemoryContext } from '@/types/memory';

describe('Context Assembler', () => {
  const assembler = createContextAssembler();

  const createMockEntity = (overrides: Partial<any> = {}): RetrievedEntity => ({
    entity: {
      id: `entity_${Math.random()}`,
      entity_type: 'document',
      workspace_id: 'user_123',
      entity_id: `id_${Math.random()}`,
      entity_data: {
        title: overrides.title || 'Test Document',
        content: overrides.content || 'Test content about quadratic equations',
      },
      metadata: {
        title: overrides.title || 'Test Document',
        subject_id: 'maths',
      },
      relationships: [],
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    relevance_score: 1,
  });

  const mockWorkspaceContext = {
    user_id: 'user_123',
    subjects: [{ id: 'maths', name: 'Mathematics', grade: '10' }],
    documents: [],
    flashcards: [],
    quizzes: [],
    calendar_events: [],
    recent_activities: [],
    memory: { facts: [], preferences: [], strengths: [], weak_areas: [], study_patterns: [] },
    preferences: {
      grade: '10',
      state: 'NSW',
      timezone: 'Australia/Sydney',
      analogy_intensity: 3,
      response_length: 'moderate' as const,
    },
  };

  const mockMemoryContext: MemoryContext = {
    facts: ['Student is in Year 10'],
    preferences: ['Prefers visual examples'],
    strengths: ['Good at algebra'],
    weak_areas: ['Trigonometry'],
    study_patterns: [],
  };

  describe('assemble', () => {
    it('should assemble context with default config', async () => {
      const entities = [
        createMockEntity({ title: 'Math Notes', content: 'Algebra content' }),
        createMockEntity({ title: 'Chemistry Notes', content: 'Chemical reactions' }),
      ];

      const result = await assembler.assemble(
        entities,
        mockWorkspaceContext,
        mockMemoryContext,
        mockWorkspaceContext.preferences
      );

      expect(result).toBeDefined();
      expect(result.sections).toBeDefined();
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.systemPrompt).toBeTruthy();
      expect(result.workspaceContext).toBeTruthy();
    });

    it('should include system section', async () => {
      const result = await assembler.assemble(
        [],
        mockWorkspaceContext,
        mockMemoryContext
      );

      const systemSection = result.sections.find(s => s.type === 'system');
      expect(systemSection).toBeDefined();
      expect(systemSection?.content).toContain('Grade: 10');
      expect(systemSection?.content).toContain('Mathematics');
    });

    it('should include memory section', async () => {
      const result = await assembler.assemble(
        [],
        mockWorkspaceContext,
        mockMemoryContext
      );

      const memorySection = result.sections.find(s => s.type === 'memory');
      expect(memorySection).toBeDefined();
      expect(memorySection?.content).toContain('MEMORY');
    });

    it('should handle workspace entities correctly', async () => {
      const entities = [
        createMockEntity({ title: 'Quadratic Equations', content: 'Learning about x² + bx + c = 0' }),
        createMockEntity({ title: 'Linear Algebra', content: 'Matrix operations and vectors' }),
        createMockEntity({ title: 'Chemistry Formulas', content: 'Periodic table elements' }),
      ];

      const result = await assembler.assemble(
        entities,
        mockWorkspaceContext,
        { facts: [], preferences: [], strengths: [], weak_areas: [], study_patterns: [] }
      );

      const workspaceSection = result.sections.find(s => s.type === 'workspace');
      expect(workspaceSection?.content).toContain('Quadratic Equations');
    });

    it('should respect max tokens', async () => {
      const smallAssembler = createContextAssembler({
        maxContextTokens: 100,
      });

      const entities = Array(20).fill(null).map((_, i) =>
        createMockEntity({ title: `Document ${i}`, content: 'x'.repeat(500) })
      );

      const result = await smallAssembler.assemble(
        entities,
        mockWorkspaceContext,
        mockMemoryContext
      );

      expect(result.totalTokens).toBeLessThanOrEqual(150);
    });

    it('should handle empty entities', async () => {
      const result = await assembler.assemble(
        [],
        mockWorkspaceContext,
        mockMemoryContext
      );

      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('truncation', () => {
    it('should truncate content that exceeds max tokens', async () => {
      const smallAssembler = createContextAssembler({
        maxContextTokens: 50,
      });

      const entities = [
        createMockEntity({ content: 'a'.repeat(500) }),
      ];

      const result = await smallAssembler.assemble(
        entities,
        mockWorkspaceContext,
        { facts: [], preferences: [], strengths: [], weak_areas: [], study_patterns: [] }
      );

      expect(result.sections.some(s => s.content.includes('[truncated]'))).toBe(true);
    });
  });
});

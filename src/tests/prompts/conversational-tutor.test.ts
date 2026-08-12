import { describe, it, expect } from 'vitest';
import { buildPersonalityInstructions } from '@/lib/aiMemory';
import { DEFAULT_AI_PERSONALITY } from '@/types/ai-personality';

describe('Conversational Tutor Prompts', () => {
  it('should not produce canned robotic openers in friendly tone', () => {
    const persona = { ...DEFAULT_AI_PERSONALITY, friendliness: 85 };
    const instructions = buildPersonalityInstructions(persona, 3);

    expect(instructions).toContain('not like a scripted chatbot');
    expect(instructions).toContain('Great question!');
    // The instruction must explicitly discourage the canned opener
    expect(instructions).toContain("Skip canned openers");
  });

  it('should keep step_by_step working light instead of demanding every step', () => {
    const persona = { ...DEFAULT_AI_PERSONALITY, step_by_step: true };
    const instructions = buildPersonalityInstructions(persona, 3);

    expect(instructions).not.toContain('Show every single step');
    expect(instructions).toContain('keep it light');
    expect(instructions).toContain("don't copy out every single rearrangement");
  });

  it('should keep detailed explanations approachable for younger students', () => {
    const persona = { ...DEFAULT_AI_PERSONALITY, detail_level: 90 };
    const instructions = buildPersonalityInstructions(persona, 3);

    expect(instructions).toContain('stay approachable');
    expect(instructions).toContain("doesn't mean walls of equations");
    expect(instructions).toContain("student's year level");
  });
});
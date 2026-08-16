import { describe, it, expect } from 'vitest';

import { enforceGroqRequestBudget } from '@/app/api/groq/_utils';

const charsPerToken = 3.5;
const estimate = (text: string) => Math.ceil(text.length / charsPerToken);

const sys = (n = 1) => ({ role: "system", content: "s".repeat(n) });
const user = (n = 1) => ({ role: "user", content: "u".repeat(n) });
const assistant = (n = 1) => ({ role: "assistant", content: "a".repeat(n) });

describe('enforceGroqRequestBudget', () => {
  it('keeps small requests unchanged', () => {
    const messages = [sys(), user(50), assistant(30), user(40)];
    const { messages: out, maxTokens } = enforceGroqRequestBudget(messages, 1024, 7000);
    expect(out).toHaveLength(4);
    expect(out.map(m => m.content)).toEqual(messages.map(m => m.content));
    expect(maxTokens).toBe(1024);
  });

  it('caps max_tokens when input + output would exceed the budget', () => {
    const messages = [sys(4000), user(4000)];
    // input ≈ 2286t, requesting 6000 output would blow past 7000
    const { messages: out, maxTokens } = enforceGroqRequestBudget(messages, 6000, 7000);
    expect(out).toHaveLength(2);
    expect(maxTokens).toBeLessThan(6000);
    const inputTokens = estimate(sys(4000).content) + estimate(user(4000).content);
    expect(inputTokens + maxTokens).toBeLessThanOrEqual(7000);
  });

  it('drops oldest non-system messages to fit the budget', () => {
    const big = 3000; // ~857t each
    const messages = [sys(500), user(big), assistant(big), user(big), user(big), user(20)];
    const { messages: out } = enforceGroqRequestBudget(messages, 512, 7000);
    // Must always keep the system prompt and the latest user ask.
    expect(out[0].role).toBe("system");
    expect(out[out.length - 1].content).toBe("u".repeat(20));
    // The rest fit within budget
    const total = out.reduce((sum, m) => sum + estimate(m.content), 0) + 512;
    expect(total).toBeLessThanOrEqual(7000);
  });

  it('truncates a single oversized message instead of dropping it', () => {
    const huge = 30000; // ~8572t, cannot fit on its own
    const messages = [sys(500), user(huge)];
    const { messages: out, maxTokens } = enforceGroqRequestBudget(messages, 512, 7000);
    expect(out).toHaveLength(2);
    const total = estimate(out[0].content) + estimate(out[1].content) + maxTokens;
    expect(total).toBeLessThanOrEqual(7000);
    // The content must have been truncated (suffix added, not full length)
    expect(out[1].content.length).toBeLessThan(huge);
  });

  it('never returns a max_tokens below the minimum completion floor', () => {
    const messages = [sys(5000), user(5000)];
    const { messages: out, maxTokens } = enforceGroqRequestBudget(messages, 1, 7000);
    expect(maxTokens).toBeGreaterThanOrEqual(256);
    const total = out.reduce((sum, m) => sum + estimate(m.content), 0) + maxTokens;
    expect(total).toBeLessThanOrEqual(7000);
  });

  it('handles an empty message list gracefully', () => {
    const { messages: out, maxTokens } = enforceGroqRequestBudget([], 1024, 7000);
    expect(out).toEqual([]);
    expect(maxTokens).toBe(1024);
  });
});
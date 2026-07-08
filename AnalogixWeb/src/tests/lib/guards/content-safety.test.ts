import { describe, it, expect } from 'vitest';
import { validateContentSafety, validatePermissions } from '@/lib/guards/content-safety';

describe('validateContentSafety', () => {
  it('allows safe content', () => {
    const result = validateContentSafety('Hello, this is safe content.');
    expect(result.allowed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('blocks script tags', () => {
    const result = validateContentSafety('<script>alert("xss")</script>');
    expect(result.allowed).toBe(false);
    expect(result.errors.some(e => e.code === 'DANGEROUS_CONTENT')).toBe(true);
  });

  it('blocks javascript: URLs', () => {
    const result = validateContentSafety('click here javascript:alert(1)');
    expect(result.allowed).toBe(false);
  });

  it('blocks event handler attributes', () => {
    const result = validateContentSafety('<img onerror="alert(1)" src=x>');
    expect(result.allowed).toBe(false);
  });

  it('blocks grecaptcha patterns', () => {
    const result = validateContentSafety('___grecaptcha_loaded');
    expect(result.allowed).toBe(false);
    expect(result.errors.some(e => e.code === 'BLOCKED_CONTENT')).toBe(true);
  });

  it('returns allowed for non-string content', () => {
    expect(validateContentSafety(null).allowed).toBe(true);
    expect(validateContentSafety(undefined).allowed).toBe(true);
    expect(validateContentSafety(42 as any).allowed).toBe(true);
  });

  it('warns about very large content (>100k chars)', () => {
    const large = 'x'.repeat(100001);
    const result = validateContentSafety(large);
    expect(result.warnings.some(w => w.code === 'VERY_LARGE_CONTENT')).toBe(true);
  });

  it('does not warn about content under limit', () => {
    const small = 'x'.repeat(1000);
    const result = validateContentSafety(small);
    expect(result.warnings.filter(w => w.code === 'VERY_LARGE_CONTENT')).toHaveLength(0);
  });
});

describe('validatePermissions', () => {
  it('allows when user owns the entity', () => {
    const result = validatePermissions('user_1', {}, 'user_1');
    expect(result.allowed).toBe(true);
  });

  it('denies when user does not own the entity', () => {
    const result = validatePermissions('user_1', {}, 'user_2');
    expect(result.allowed).toBe(false);
    expect(result.errors.some(e => e.code === 'PERMISSION_DENIED')).toBe(true);
  });
});

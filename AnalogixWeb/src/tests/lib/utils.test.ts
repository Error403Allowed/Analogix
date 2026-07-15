import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges class strings', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('handles conditional classes', () => {
    expect(cn('base', '', 'visible')).toBe('base visible');
  });

  it('handles array inputs', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });

  it('resolves tailwind conflicts (last wins)', () => {
    const result = cn('px-4', 'px-6');
    expect(result).toBe('px-6');
  });

  it('handles undefined values gracefully', () => {
    expect(cn('a', undefined, 'b')).toBe('a b');
  });

  it('handles null values gracefully', () => {
    expect(cn('a', null, 'b')).toBe('a b');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });

  it('merges multiple class categories correctly', () => {
    const result = cn(
      'flex items-center',
      'bg-red-500 hover:bg-red-600',
      'text-white font-bold',
      'rounded-lg px-4 py-2',
    );
    expect(result).toContain('flex');
    expect(result).toContain('items-center');
    expect(result).toContain('text-white');
  });
});

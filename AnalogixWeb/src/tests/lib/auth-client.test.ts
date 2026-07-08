import { describe, it, expect } from 'vitest';
import { getEmailError, validatePassword } from '@/lib/auth-client';

describe('validatePassword', () => {
  it('rejects empty password', () => {
    const { allPass, checks } = validatePassword('');
    expect(allPass).toBe(false);
    expect(checks.every(c => c.pass === false)).toBe(true);
  });

  it('rejects password that is too short', () => {
    const { allPass, checks } = validatePassword('Ab1!');
    expect(allPass).toBe(false);
    expect(checks.find(c => c.key === 'minLength')?.pass).toBe(false);
  });

  it('rejects password missing lowercase', () => {
    const { allPass, checks } = validatePassword('ABCD1234!');
    expect(allPass).toBe(false);
    expect(checks.find(c => c.key === 'lowercase')?.pass).toBe(false);
  });

  it('rejects password missing uppercase', () => {
    const { allPass, checks } = validatePassword('abcd1234!');
    expect(allPass).toBe(false);
    expect(checks.find(c => c.key === 'uppercase')?.pass).toBe(false);
  });

  it('rejects password missing digit', () => {
    const { allPass, checks } = validatePassword('Abcdefgh!');
    expect(allPass).toBe(false);
    expect(checks.find(c => c.key === 'digit')?.pass).toBe(false);
  });

  it('rejects password missing symbol', () => {
    const { allPass, checks } = validatePassword('Abcdefgh1');
    expect(allPass).toBe(false);
    expect(checks.find(c => c.key === 'symbol')?.pass).toBe(false);
  });

  it('accepts password meeting all criteria', () => {
    const { allPass, checks } = validatePassword('Abcdef1!');
    expect(allPass).toBe(true);
    expect(checks.every(c => c.pass)).toBe(true);
  });

  it('accepts password with multiple symbols', () => {
    const { allPass } = validatePassword('Str0ng!@#$');
    expect(allPass).toBe(true);
  });

  it('treats spaces as symbols', () => {
    const { allPass } = validatePassword('Abcdef1 2');
    expect(allPass).toBe(true);
  });

  it('returns correct check labels', () => {
    const { checks } = validatePassword('');
    expect(checks.map(c => c.label)).toEqual([
      'At least 8 characters',
      'One lowercase letter',
      'One uppercase letter',
      'One number',
      'One symbol',
    ]);
  });

  it('checks length requirement exactly at 8', () => {
    const short = validatePassword('Ab1!567');
    expect(short.allPass).toBe(false);
    expect(short.checks.find(c => c.key === 'minLength')?.pass).toBe(false);

    const exact = validatePassword('Ab1!5678');
    expect(exact.checks.find(c => c.key === 'minLength')?.pass).toBe(true);
  });
});

describe('getEmailError', () => {
  it('returns correct message for invalid credentials', () => {
    const result = getEmailError('invalid_credentials', null);
    expect(result).toBe('Invalid email or password. Maybe you signed in using Google.');
  });

  it('returns correct message for wrong password', () => {
    const result = getEmailError('wrong_password', null);
    expect(result).toBe('Invalid email or password. Maybe you signed in using Google.');
  });

  it('returns correct message when message contains "invalid login credentials"', () => {
    const result = getEmailError(null, 'Invalid login credentials');
    expect(result).toBe('Invalid email or password. Maybe you signed in using Google.');
  });

  it('returns correct message for email not confirmed', () => {
    const result = getEmailError('email_not_confirmed', null);
    expect(result).toBe('Please confirm your email address first — check your inbox for a confirmation link.');
  });

  it('returns correct message when message contains "email not confirmed"', () => {
    const result = getEmailError(null, 'Email not confirmed');
    expect(result).toBe('Please confirm your email address first — check your inbox for a confirmation link.');
  });

  it('returns correct message for user not found', () => {
    const result = getEmailError('user_not_found', null);
    expect(result).toBe('No account found with this email.');
  });

  it('returns correct message for weak password', () => {
    const result = getEmailError('weak_password', null);
    expect(result).toBe('Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.');
  });

  it('returns correct message when message contains "password should be at least 8"', () => {
    const result = getEmailError(null, 'Password should be at least 8 characters.');
    expect(result).toBe('Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.');
  });

  it('returns correct message when message contains "weak password"', () => {
    const result = getEmailError(null, 'Weak password, please choose a stronger one.');
    expect(result).toBe('Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.');
  });

  it('returns correct message for email exists', () => {
    const result = getEmailError('email_exists', null);
    expect(result).toBe('An account with this email already exists. Try signing in.');
  });

  it('returns correct message when message contains "user already registered"', () => {
    const result = getEmailError(null, 'User already registered');
    expect(result).toBe('An account with this email already exists. Try signing in.');
  });

  it('returns correct message for rate limit', () => {
    const result = getEmailError('rate_limit', null);
    expect(result).toBe('Too many attempts. Please wait a moment and try again.');
  });

  it('returns correct message when message contains "too many requests"', () => {
    const result = getEmailError(null, 'Too many requests');
    expect(result).toBe('Too many attempts. Please wait a moment and try again.');
  });

  it('returns raw message when no code matches', () => {
    const result = getEmailError(null, 'Some unknown error occurred');
    expect(result).toBe('Some unknown error occurred');
  });

  it('returns fallback message when both code and message are null', () => {
    const result = getEmailError(null, null);
    expect(result).toBe('Something went wrong. Please try again.');
  });

  it('returns fallback message when code is null and message is empty', () => {
    const result = getEmailError(null, '');
    expect(result).toBe('Something went wrong. Please try again.');
  });

  it('is case-insensitive when matching codes', () => {
    const result = getEmailError('INVALID_CREDENTIALS', null);
    expect(result).toBe('Invalid email or password. Maybe you signed in using Google.');
  });

  it('is case-insensitive when matching messages', () => {
    const result = getEmailError(null, 'WEAK PASSWORD');
    expect(result).toBe('Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.');
  });
});

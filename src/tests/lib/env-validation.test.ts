import { describe, it, expect, beforeEach } from 'vitest';
import { checkEnvironmentSetup, validateEnvVar } from '@/lib/env-validation';

const ORIGINAL_ENV = { ...process.env };

describe('validateEnvVar', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns valid when env var exists', () => {
    process.env.TEST_VAR = 'some-value';
    const result = validateEnvVar('TEST_VAR');
    expect(result.valid).toBe(true);
    expect(result.message).toContain('configured');
  });

  it('returns invalid when required env var missing', () => {
    delete process.env.MISSING_VAR;
    const result = validateEnvVar('MISSING_VAR', true);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('missing');
  });

  it('returns valid when optional env var missing', () => {
    delete process.env.OPTIONAL_VAR;
    const result = validateEnvVar('OPTIONAL_VAR', false);
    expect(result.valid).toBe(true);
    expect(result.message).toContain('not set');
  });

  it('returns invalid when env var is empty string', () => {
    process.env.EMPTY_VAR = '';
    const result = validateEnvVar('EMPTY_VAR');
    expect(result.valid).toBe(false);
  });
});

describe('checkEnvironmentSetup', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('detects all vars as healthy when set', () => {
    process.env.GROQ_API_KEY = 'gk-xxx';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-key';

    const result = checkEnvironmentSetup();
    expect(result.isHealthy).toBe(true);
    expect(result.checks.every(c => c.status === 'present' || !c.isRequired)).toBe(true);
  });

  it('detects missing required vars as unhealthy', () => {
    delete process.env.GROQ_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const result = checkEnvironmentSetup();
    expect(result.isHealthy).toBe(false);
    expect(result.checks.filter(c => c.status === 'missing').length).toBeGreaterThanOrEqual(3);
  });

  it('includes diagnostics for each missing var', () => {
    delete process.env.GROQ_API_KEY;
    const result = checkEnvironmentSetup();
    expect(result.diagnostics.some(d => d.includes('GROQ_API_KEY'))).toBe(true);
  });

  it('marks optional SUPABASE_SERVICE_ROLE_KEY as non-fatal', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.GROQ_API_KEY = 'gk-xxx';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const result = checkEnvironmentSetup();
    expect(result.isHealthy).toBe(true);
    expect(result.checks.find(c => c.name === 'SUPABASE_SERVICE_ROLE_KEY')?.status).toBe('missing');
  });
});

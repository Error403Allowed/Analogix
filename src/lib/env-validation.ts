/**
 * Environment validation utilities.
 * Helps diagnose "Failed to fetch" errors by checking required env vars.
 */

type EnvVarStatus = 'present' | 'missing' | 'invalid';

interface EnvCheck {
  name: string;
  value?: string;
  status: EnvVarStatus;
  isRequired: boolean;
}

/**
 * Check if critical environment variables are configured.
 * Returns diagnostics to help debug "Failed to fetch" errors.
 */
export const checkEnvironmentSetup = (): {
  checks: EnvCheck[];
  isHealthy: boolean;
  diagnostics: string[];
} => {
  const checks: EnvCheck[] = [];
  const diagnostics: string[] = [];

  // Check API keys
  const groqKey = process.env.GROQ_API_KEY;
  checks.push({
    name: 'GROQ_API_KEY',
    status: groqKey ? 'present' : 'missing',
    isRequired: true,
  });

  if (!groqKey) {
    diagnostics.push('❌ GROQ_API_KEY is missing. AI features will fail.');
  }

  // Check Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  checks.push({
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    status: supabaseUrl ? 'present' : 'missing',
    isRequired: true,
  });

  checks.push({
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    status: supabaseKey ? 'present' : 'missing',
    isRequired: true,
  });

  if (!supabaseUrl) {
    diagnostics.push('❌ NEXT_PUBLIC_SUPABASE_URL is missing. Auth and data will fail.');
  }

  if (!supabaseKey) {
    diagnostics.push('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Supabase client cannot initialize.');
  }

  // Check optional server-side keys
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  checks.push({
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    status: serviceRoleKey ? 'present' : 'missing',
    isRequired: false,
  });

  if (!serviceRoleKey) {
    diagnostics.push('⚠️  SUPABASE_SERVICE_ROLE_KEY is missing. Server operations (account deletion) will fail.');
  }

  // Determine overall health
  const requiredChecks = checks.filter(c => c.isRequired);
  const failedRequired = requiredChecks.filter(c => c.status === 'missing');
  const isHealthy = failedRequired.length === 0;

  if (isHealthy && diagnostics.length === 0) {
    diagnostics.push('✅ Environment is properly configured.');
  }

  return { checks, isHealthy, diagnostics };
};

/**
 * Log environment diagnostics to console.
 * Useful for debugging in development.
 */
export const logEnvironmentStatus = () => {
  if (typeof window === 'undefined') {
    // Server-side only
    const { diagnostics } = checkEnvironmentSetup();
    console.log('[Environment Status]', diagnostics.join('\n'));
  }
};

/**
 * Validate a specific environment variable exists and is not empty.
 */
export const validateEnvVar = (
  varName: string,
  isRequired: boolean = true
): { valid: boolean; message: string } => {
  const value = process.env[varName];

  if (!value) {
    if (isRequired) {
      return {
        valid: false,
        message: `Required environment variable missing: ${varName}`,
      };
    }
    return {
      valid: true,
      message: `Optional environment variable not set: ${varName}`,
    };
  }

  return {
    valid: true,
    message: `Environment variable configured: ${varName}`,
  };
};

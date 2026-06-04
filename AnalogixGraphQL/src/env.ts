import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable: ${name}.\n` +
        `Copy .env.example to .env and fill it in. See AnalogixGraphQL/README.md for details.`
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  supabase: {
    url: required("SUPABASE_URL", "https://placeholder.supabase.co"),
    anonKey: required("SUPABASE_ANON_KEY", "placeholder-anon"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY", "placeholder-service"),
  },

  groq: {
    primaryKey: optional("GROQ_API_KEY", "placeholder-groq"),
    secondaryKey: optional("GROQ_API_KEY_2", ""),
  },

  google: {
    clientId: optional("GOOGLE_CLIENT_ID", ""),
    clientSecret: optional("GOOGLE_CLIENT_SECRET", ""),
  },

  desmos: {
    apiKey: optional("DESMOS_API_KEY", ""),
  },

  redisUrl: optional("REDIS_URL", ""),

  logLevel: optional("LOG_LEVEL", "info"),
};

export const isProd = env.nodeEnv === "production";
export const isDev = !isProd;

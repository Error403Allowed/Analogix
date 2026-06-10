import { createBrowserClient } from "@supabase/ssr";

const browserSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const browserSupabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!browserSupabaseUrl || !browserSupabaseAnonKey) {
  throw new Error(
    "@supabase/ssr: Your project's URL and API key are required to create a Supabase client!\n" +
      "Check your Supabase project's API settings and make sure NEXT_PUBLIC_SUPABASE_URL " +
      "and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment."
  );
}

// Singleton pattern — one Supabase client per tab to avoid multiple GoTrueClient instances
// which can cause undefined behavior with auth state and token refresh
let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = (): any => {
  if (!cachedClient) {
    cachedClient = createBrowserClient(browserSupabaseUrl, browserSupabaseAnonKey, {
      auth: {
        detectSessionInUrl: false,
      },
    });
  }
  return cachedClient;
};

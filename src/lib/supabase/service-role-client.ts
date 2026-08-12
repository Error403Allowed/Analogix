import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only client authenticated with the service role key. Bypasses RLS
 * for ingestion/backfill scripts and trusted admin operations. Never import
 * this from client components or pass it to the browser.
 */
let cachedClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createServiceRoleClient(): ReturnType<typeof createSupabaseClient> {
  if (cachedClient) return cachedClient;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      "createServiceRoleClient: SUPABASE_SERVICE_ROLE_KEY (and the project URL) are required."
    );
  }

  cachedClient = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cachedClient;
}

/**
 * Singleton Supabase client. Used directly by the mobile app for:
 *  - Google sign-in (signInWithIdToken)
 *  - Auth state observation (onAuthStateChange)
 *  - Direct RLS-respecting reads when the user is on-device
 *
 * The BFF does NOT proxy auth — it validates the access token in the
 * Authorization header against the same Supabase JWKS.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}

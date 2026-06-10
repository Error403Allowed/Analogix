/**
 * Singleton Supabase client. Used directly by the mobile app for:
 *  - Google sign-in (signInWithOAuth)
 *  - Auth state observation (onAuthStateChange)
 *  - Direct RLS-respecting reads when the user is on-device
 *
 * The BFF does NOT proxy auth — it validates the access token in the
 * Authorization header against the same Supabase JWKS.
 */
import { Platform } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { config } from "./config";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  if (Platform.OS === "web") {
    cached = createBrowserClient(config.supabase.url, config.supabase.anonKey);
  } else {
    cached = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  return cached;
}

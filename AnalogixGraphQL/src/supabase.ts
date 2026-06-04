import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/**
 * Service-role Supabase client. Bypasses RLS — only for system tasks (AI
 * completions, Yjs persistence, server-side aggregations).
 * Never expose results to the wrong user; always pair with the per-request
 * user-scoped client from `getUserClient()`.
 */
export const serviceClient: SupabaseClient = createClient(
  env.supabase.url,
  env.supabase.serviceRoleKey,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

/**
 * Creates a Supabase client scoped to a specific user access token.
 * This is what runs queries with RLS applied — exactly like the web app does.
 */
export function getUserClient(accessToken: string): SupabaseClient {
  return createClient(env.supabase.url, env.supabase.anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

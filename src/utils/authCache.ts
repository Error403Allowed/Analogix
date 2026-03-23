"use client";

/**
 * Shared auth user cache — single source of truth for all stores.
 *
 * Supabase's getUser() acquires an exclusive Navigator LockManager lock on the
 * auth token key. When multiple stores call it concurrently (page load, etc.)
 * they all queue on the same lock and the 10 s timeout fires.
 *
 * Solution: one module-level cache + in-flight dedup. All stores import
 * `getAuthUser` from here instead of calling supabase.auth.getUser() directly.
 */

import { createClient } from "@/lib/supabase/client";

type AuthUser = { id: string };

let cachedUser: AuthUser | null = null;
let inFlight: Promise<AuthUser | null> | null = null;

/** Returns the current user from cache, or fetches once and caches. */
export async function getAuthUser(): Promise<AuthUser | null> {
  if (cachedUser) return cachedUser;
  if (inFlight)   return inFlight;

  inFlight = (async () => {
    try {
      // getSession() reads from localStorage synchronously — no lock needed.
      // Only falls back to getUser() (network round-trip + lock) when there's no
      // session at all, which means the user isn't logged in anyway.
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      cachedUser = user ? { id: user.id } : null;
      return cachedUser;
    } catch (err) {
      console.warn("[authCache] getSession failed, falling back to getUser:", err);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        cachedUser = user ? { id: user.id } : null;
        return cachedUser;
      } catch {
        return null;
      }
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Call this whenever auth state changes (sign in / sign out). */
export function invalidateAuthCache() {
  cachedUser = null;
  inFlight   = null;
}

// Auto-invalidate on auth state changes so sign-out clears immediately
if (typeof window !== "undefined") {
  const supabase = createClient();
  supabase.auth.onAuthStateChange(() => invalidateAuthCache());
}

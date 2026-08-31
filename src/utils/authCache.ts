"use client";

/**
 * Shared auth user cache - single source of truth for all stores.
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
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Returns the current user from cache, or fetches once and caches. */
export async function getAuthUser(): Promise<AuthUser | null> {
  // Return cached user if still valid
  if (cachedUser && Date.now() - lastFetchTime < CACHE_TTL) {
    return cachedUser;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const supabase = createClient();
      
      // First try to get session from localStorage (fast, no network)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn("[authCache] getSession error:", sessionError.message);
        // If session error is JWT-related, try to refresh
        if (sessionError.message.includes("JWT") || sessionError.message.includes("PGRST301")) {
          console.log("[authCache] Attempting token refresh...");
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error("[authCache] Token refresh failed:", refreshError.message);
            // Clear corrupted auth state
            await supabase.auth.signOut();
            cachedUser = null;
            return null;
          }
          if (refreshedSession?.user) {
            cachedUser = { id: refreshedSession.user.id };
            lastFetchTime = Date.now();
            return cachedUser;
          }
        }
      }
      
      const user = session?.user ?? null;
      
      // If no session, try getUser() as fallback (network call)
      if (!user) {
        const { data: { user: fetchedUser }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.warn("[authCache] getUser failed:", userError.message);
          if (userError.message.includes("JWT") || userError.message.includes("PGRST301")) {
            await supabase.auth.signOut();
          }
          cachedUser = null;
          return null;
        }
        cachedUser = fetchedUser ? { id: fetchedUser.id } : null;
      } else {
        cachedUser = { id: user.id };
      }
      
      lastFetchTime = Date.now();
      return cachedUser;
    } catch (err) {
      console.error("[authCache] Unexpected error:", err);
      cachedUser = null;
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Call this whenever auth state changes (sign in / sign out). */
export function invalidateAuthCache() {
  cachedUser = null;
  inFlight = null;
  lastFetchTime = 0;
}

/** Force a fresh fetch on next call */
export function forceRefreshAuth() {
  cachedUser = null;
  inFlight = null;
  lastFetchTime = 0;
}

// Keep cache in sync with auth state changes
if (typeof window !== "undefined") {
  const supabase = createClient();
  supabase.auth.onAuthStateChange((event: any, session: any) => {
    // Always clear stale cache on auth changes
    cachedUser = null;
    inFlight = null;
    lastFetchTime = 0;
    
    // If we have a fresh session, pre-populate the cache immediately
    // so the next getAuthUser() call doesn't race with localStorage writes
    if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
      cachedUser = { id: session.user.id };
      lastFetchTime = Date.now();
    }
    
    // On sign out, ensure complete cleanup
    if (event === "SIGNED_OUT") {
      cachedUser = null;
      lastFetchTime = 0;
    }
  });
}

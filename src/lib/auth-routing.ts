"use client";

import { createClient } from "@/lib/supabase/client";
import {
  hasProfileData,
  readUserPreferences,
  syncPrefsFromProfile,
  type ProfileRecord,
} from "@/lib/profile-sync";

/**
 * Where an authenticated user should be routed next.
 * - "app"        → they have completed onboarding → send straight to the app.
 * - "onboarding" → brand-new (or incomplete) account → run them through setup.
 */
export type AuthDestination = "app" | "onboarding";

/**
 * Decide whether an authenticated user should be sent straight into the app or
 * through onboarding. This is the single gate used by /login, the auth callback
 * and ProtectedRoute so every entry point makes the same decision.
 *
 * Fast path: if this browser already knows the user finished onboarding, skip
 * the network round trip entirely (returning users boot straight in).
 * Otherwise the Supabase `profiles` row is the source of truth; if the profile
 * carries real onboarding data it is also hydrated into the local cache.
 */
export async function resolveAuthDestination(
  userId: string
): Promise<AuthDestination> {
  try {
    const prefs = readUserPreferences();
    // Only trust the local cache when it actually carries the user's data.
    // A stale or partial cache (e.g. name/grade/subjects missing) must not
    // route the user to the app with default values - fall through to the
    // canonical profiles row so the real saved details are hydrated.
    const hasRealData =
      Boolean(prefs.name) &&
      Boolean(prefs.grade) &&
      Array.isArray(prefs.subjects) &&
      prefs.subjects.length > 0;
    if (prefs?.onboardingComplete && hasRealData && (!prefs.userId || prefs.userId === userId)) {
      return "app";
    }
  } catch {
    /* ignore storage errors - fall through to the DB */
  }

  try {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "onboarding_complete, name, grade, state, subjects, hobbies, hobby_ids, hobby_details, avatar_url, tours_completed"
      )
      .eq("id", userId)
      .maybeSingle();

    if (hasProfileData(profile as ProfileRecord | null)) {
      syncPrefsFromProfile(profile as ProfileRecord, userId);
      return "app";
    }
  } catch {
    /* DB unreachable - fall through */
  }

  return "onboarding";
}
"use client";

/**
 * Single source of truth for reading/writing the app's local profile cache
 * (`userPreferences` in localStorage) and for hydrating that cache from the
 * canonical `profiles` row in Supabase. The database is authoritative; the
 * localStorage copy is a per-browser cache that lets returning users boot
 * straight into the app without waiting on the network.
 */

export type ProfileRecord = {
  name?: string | null;
  grade?: string | null;
  state?: string | null;
  subjects?: string[] | null;
  hobbies?: string[] | null;
  hobby_ids?: string[] | null;
  hobby_details?: Record<string, unknown> | null;
  avatar_url?: string | null;
  onboarding_complete?: boolean | null;
};

export type UserPreferences = {
  name?: string;
  grade?: string | null;
  state?: string | null;
  subjects?: string[];
  hobbies?: string[];
  hobbyIds?: string[];
  hobbyDetails?: Record<string, unknown>;
  avatarUrl?: string;
  onboardingComplete?: boolean;
  userId?: string;
};

const PREFS_KEY = "userPreferences";

export function readUserPreferences(): UserPreferences {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as UserPreferences;
  } catch {
    return {};
  }
}

export function writeUserPreferences(prefs: UserPreferences): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("userPreferencesUpdated"));
  }
}

/**
 * True when the profile row has real onboarding data (grade, state, subjects,
 * hobbies...) or has been explicitly marked complete. A brand-new account
 * (auto-created by the handle_new_user trigger with nothing else filled in)
 * returns false, which routes the user through onboarding.
 */
export function hasProfileData(profile?: ProfileRecord | null): boolean {
  if (!profile) return false;
  if (profile.onboarding_complete) return true;
  if (profile.grade || profile.state) return true;
  if (Array.isArray(profile.subjects) && profile.subjects.length > 0) return true;
  if (Array.isArray(profile.hobbies) && profile.hobbies.length > 0) return true;
  if (Array.isArray(profile.hobby_ids) && profile.hobby_ids.length > 0) return true;
  if (
    profile.hobby_details &&
    typeof profile.hobby_details === "object" &&
    Object.keys(profile.hobby_details).length > 0
  ) {
    return true;
  }
  return false;
}

/**
 * Merge a Supabase `profiles` row into the local cache and broadcast the
 * update. Returns the merged preferences so callers can use them directly.
 */
export function syncPrefsFromProfile(
  profile: ProfileRecord,
  userId: string
): UserPreferences {
  const existing = readUserPreferences();
  const dbGrade = profile?.grade;
  const next: UserPreferences = {
    ...existing,
    name: profile?.name ?? existing.name ?? "Student",
    grade: existing.grade || dbGrade || null,
    state: profile?.state ?? existing.state ?? null,
    subjects: Array.isArray(profile?.subjects)
      ? profile.subjects
      : (existing.subjects ?? []),
    hobbies: Array.isArray(profile?.hobbies)
      ? profile.hobbies
      : (existing.hobbies ?? []),
    hobbyIds: Array.isArray(profile?.hobby_ids)
      ? profile.hobby_ids
      : (existing.hobbyIds ?? []),
    hobbyDetails:
      profile?.hobby_details && typeof profile.hobby_details === "object"
        ? profile.hobby_details
        : (existing.hobbyDetails ?? {}),
    avatarUrl: profile?.avatar_url ?? existing.avatarUrl,
    onboardingComplete: true,
    userId,
  };
  writeUserPreferences(next);
  return next;
}
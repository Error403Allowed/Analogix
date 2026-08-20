"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { readUserPreferences } from "@/lib/profile-sync";

/**
 * Resolve the current user's profile picture URL.
 *
 * The display layer caches the avatar in localStorage (`userPreferences.avatarUrl`),
 * but that cache can be stale or empty (e.g. before the deferred profile sync has
 * run, or for accounts whose avatar was never written locally). The canonical
 * source is the `profiles.avatar_url` column, so when the local cache has no
 * avatar this hook fetches the authoritative URL from Supabase and, best effort,
 * persists it back to the cache for every other consumer.
 */
export function useProfileAvatar(): string {
  const { user } = useAuth();
  // Starts empty so SSR and the first client render both paint the placeholder;
  // the avatar URL is only resolved after mount (localStorage isn't available
  // during SSR, so initializing from it would cause a hydration mismatch).
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    const load = () => setAvatarUrl(readUserPreferences().avatarUrl || "");
    load();
    window.addEventListener("userPreferencesUpdated", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("userPreferencesUpdated", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const fetchedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    if (fetchedForRef.current === user.id) return;
    // Read the cache directly (not the state) so the fetch decision is correct
    // on the same mount pass as the cache-loading effect above.
    if (readUserPreferences().avatarUrl) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { avatar_url?: string | null } | null }) => {
        if (cancelled) return;
        const url = data?.avatar_url;
        if (!url) return;
        setAvatarUrl(url);
        const prefs = readUserPreferences();
        if (!prefs.avatarUrl) {
          localStorage.setItem("userPreferences", JSON.stringify({ ...prefs, avatarUrl: url }));
          window.dispatchEvent(new Event("userPreferencesUpdated"));
        }
      })
      .catch(() => {
        /* best effort - fall back to whatever the cache had */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return avatarUrl;
}

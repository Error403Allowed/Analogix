"use client";

import { useEffect, useState } from "react";
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
  const [avatarUrl, setAvatarUrl] = useState<string>(() => readUserPreferences().avatarUrl || "");

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

  useEffect(() => {
    if (!user || avatarUrl) return;
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
  }, [user, avatarUrl]);

  return avatarUrl;
}

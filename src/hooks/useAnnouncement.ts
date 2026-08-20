"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getAuthUser } from "@/utils/authCache";
import { createClient } from "@/lib/supabase/client";
import { latestAnnouncement, shouldShowAnnouncement } from "@/lib/announcements";

interface UseAnnouncementResult {
  show: boolean;
  dismiss: () => void;
}

/**
 * One-time "What's New" notice. Decides eligibility from the user's profile
 * (created_at before the release date and the announcement not already
 * dismissed), then exposes a dismiss action that persists the seen id.
 * Fails closed: any profile/read error means the notice is simply not shown.
 */
export function useAnnouncement(): UseAnnouncementResult {
  const [show, setShow] = useState(false);
  const seenRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getAuthUser();
        if (!user) return;
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("created_at, announcements_seen")
          .eq("id", user.id)
          .maybeSingle();
        if (error) return;
        if (!data) return;
        if (cancelled) return;
        seenRef.current = Array.isArray(data.announcements_seen)
          ? data.announcements_seen
          : [];
        const decided = shouldShowAnnouncement({
          createdAt: data.created_at,
          announcementsSeen: seenRef.current,
        });
        if (decided) setShow(true);
      } catch {
        // Fails closed - no notice when eligibility can't be confirmed.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    setShow(false);
    const id = latestAnnouncement?.id;
    if (!id) return;
    (async () => {
      try {
        const user = await getAuthUser();
        if (!user) return;
        const supabase = createClient();
        await supabase
          .from("profiles")
          .update({ announcements_seen: [...seenRef.current, id] })
          .eq("id", user.id);
      } catch {
        // Best-effort persistence; the card is already hidden locally.
      }
    })();
  }, []);

  return { show, dismiss };
}
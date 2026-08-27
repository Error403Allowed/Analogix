"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useAnnouncement } from "@/hooks/useAnnouncement";
import { latestAnnouncement } from "@/lib/announcements";

/** One-time "What's New" card shown at the top of the dashboard after a new
 *  release, only to pre-release users who haven't dismissed it yet. */
export default function WhatsNewCard() {
  const { show, dismiss } = useAnnouncement();
  const announcement = latestAnnouncement;

  return (
    <AnimatePresence>
      {show && announcement && (
        <motion.div
          data-testid="whats-new"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="dashboard-panel p-4 flex items-start gap-3"
        >
          <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold tracking-wide text-primary">
              What&apos;s new
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{announcement.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {announcement.body}
            </p>
          </div>
          <button
            data-testid="whats-new-dismiss"
            onClick={dismiss}
            aria-label="Dismiss announcement"
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
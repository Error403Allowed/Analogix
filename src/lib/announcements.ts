// ============================================================================
// ANNOUNCEMENTS REGISTRY
// ----------------------------------------------------------------------------
// The source of truth for one-time "What's New" notices. Each release adds a
// new entry; older entries are left in place but only the latest is gated.
// `releaseDate` is the deploy cutoff: users whose profile was created before
// it get the notice once, new signups get the feature natively so they don't.
// ============================================================================

export interface Announcement {
  id: string;
  title: string;
  body: string;
  releaseDate: string;
}

export const announcements: Announcement[] = [
  {
    id: "ai-v2",
    title: "Meet the new AI tutor",
    body:
      "Chat is now powered by a rebuilt engine — faster replies, smarter study tools, " +
      "and write actions (flashcards, quizzes, events, notes) ask for your approval " +
      "before they touch your workspace.",
    releaseDate: "2026-08-21T00:00:00.000Z",
  },
];

export const latestAnnouncement: Announcement | undefined = announcements[announcements.length - 1];

export interface AnnouncementGateInput {
  announcementsSeen?: string[];
  createdAt?: string | null;
  releaseDate?: string;
}

/** Whether the latest announcement should be shown for a user. Fails closed:
 *  any uncertainty (missing created_at or seen state) means no notice. */
export function shouldShowAnnouncement({
  announcementsSeen,
  createdAt,
  releaseDate = latestAnnouncement?.releaseDate,
}: AnnouncementGateInput): boolean {
  if (!latestAnnouncement) return false;
  if (!releaseDate || !createdAt) return false;
  if (announcementsSeen?.includes(latestAnnouncement.id)) return false;
  return new Date(createdAt).getTime() < new Date(releaseDate).getTime();
}
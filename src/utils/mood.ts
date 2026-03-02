import { createClient } from "@/lib/supabase/client";
import { applyThemeByName } from "@/components/ThemeSelector";

export type MoodProfile = {
  label: string;
  theme: string;
  dashboard: {
    calendarTitle: string;
    deadlinesTitle: string;
    tutorSubtitle: string;
  };
};

export const moodProfiles = {
  focus: {
    label: "Focus",
    theme: "Classic Blue",
    dashboard: {
      calendarTitle: "Upcoming lessons",
      deadlinesTitle: "Due soon",
      tutorSubtitle: "Tight, focused explanations that keep you on track.",
    },
  },
  energized: {
    label: "Energized",
    theme: "Sunset Ember",
    dashboard: {
      calendarTitle: "Let us move",
      deadlinesTitle: "Next sprints",
      tutorSubtitle: "Fast-paced analogies to keep momentum high.",
    },
  },
  calm: {
    label: "Calm",
    theme: "Oceanic Blue",
    dashboard: {
      calendarTitle: "Gentle schedule",
      deadlinesTitle: "Light reminders",
      tutorSubtitle: "Slow, steady explanations with breathing room.",
    },
  },
  grounded: {
    label: "Grounded",
    theme: "Forest Glow",
    dashboard: {
      calendarTitle: "Today in focus",
      deadlinesTitle: "Rooted priorities",
      tutorSubtitle: "Clear, practical explanations with real-world anchors.",
    },
  },
  bold: {
    label: "Bold",
    theme: "Cyber Neon",
    dashboard: {
      calendarTitle: "Big moves",
      deadlinesTitle: "High impact",
      tutorSubtitle: "Punchy analogies that make the point fast.",
    },
  },
  dreamy: {
    label: "Dreamy",
    theme: "Cosmic Aurora",
    dashboard: {
      calendarTitle: "Drift ahead",
      deadlinesTitle: "Soft checkpoints",
      tutorSubtitle: "Story-like explanations that spark imagination.",
    },
  },
  focused: {
    label: "Focus",
    theme: "Classic Blue",
    dashboard: {
      calendarTitle: "Upcoming lessons",
      deadlinesTitle: "Due soon",
      tutorSubtitle: "Tight, focused explanations that keep you on track.",
    },
  },
} as const satisfies Record<string, MoodProfile>;

export type MoodId = keyof typeof moodProfiles;

const DEFAULT_MOOD_ID: MoodId = "focus";

const resolveMoodId = (id: string | null | undefined): MoodId =>
  id && id in moodProfiles ? (id as MoodId) : DEFAULT_MOOD_ID;

export const getMoodProfile = (id: MoodId | string): MoodProfile =>
  moodProfiles[resolveMoodId(id)];

/** Load mood from Supabase. Falls back to 'focus' if not authenticated or no row yet. */
export const getStoredMoodId = async (): Promise<MoodId> => {
  if (typeof window === "undefined") return DEFAULT_MOOD_ID;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_MOOD_ID;

  const { data } = await supabase
    .from("user_preferences")
    .select("mood")
    .eq("user_id", user.id)
    .maybeSingle();

  return resolveMoodId(data?.mood);
};

/** Apply mood visuals and persist to Supabase. */
export const applyMoodVisuals = async (id: MoodId | string): Promise<void> => {
  if (typeof window === "undefined") return;
  const resolvedId = resolveMoodId(id);
  const profile = moodProfiles[resolvedId];

  applyThemeByName(profile.theme);
  window.dispatchEvent(new Event("themeUpdated"));
  window.dispatchEvent(new Event("moodUpdated"));

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("user_preferences").upsert(
    { user_id: user.id, mood: resolvedId, theme: profile.theme, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
};

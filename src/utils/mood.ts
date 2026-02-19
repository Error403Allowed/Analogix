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
      tutorSubtitle: "Tight, focused explanations that keep you on track."
    }
  },
  energized: {
    label: "Energized",
    theme: "Sunset Ember",
    dashboard: {
      calendarTitle: "Let us move",
      deadlinesTitle: "Next sprints",
      tutorSubtitle: "Fast-paced analogies to keep momentum high."
    }
  },
  calm: {
    label: "Calm",
    theme: "Oceanic",
    dashboard: {
      calendarTitle: "Gentle schedule",
      deadlinesTitle: "Light reminders",
      tutorSubtitle: "Slow, steady explanations with breathing room."
    }
  },
  grounded: {
    label: "Grounded",
    theme: "Forest Glow",
    dashboard: {
      calendarTitle: "Today in focus",
      deadlinesTitle: "Rooted priorities",
      tutorSubtitle: "Clear, practical explanations with real-world anchors."
    }
  },
  bold: {
    label: "Bold",
    theme: "Cyber Neon",
    dashboard: {
      calendarTitle: "Big moves",
      deadlinesTitle: "High impact",
      tutorSubtitle: "Punchy analogies that make the point fast."
    }
  },
  dreamy: {
    label: "Dreamy",
    theme: "Cosmic Aurora",
    dashboard: {
      calendarTitle: "Drift ahead",
      deadlinesTitle: "Soft checkpoints",
      tutorSubtitle: "Story-like explanations that spark imagination."
    }
  },
  focused: {
    label: "Focus",
    theme: "Classic Blue",
    dashboard: {
      calendarTitle: "Upcoming lessons",
      deadlinesTitle: "Due soon",
      tutorSubtitle: "Tight, focused explanations that keep you on track."
    }
  }
} as const satisfies Record<string, MoodProfile>;

export type MoodId = keyof typeof moodProfiles;

const DEFAULT_MOOD_ID: MoodId = "focus";

const resolveMoodId = (id: string | null | undefined): MoodId => {
  if (id && id in moodProfiles) return id as MoodId;
  return DEFAULT_MOOD_ID;
};

export const getMoodProfile = (id: MoodId | string): MoodProfile => {
  const resolved = resolveMoodId(id);
  return moodProfiles[resolved];
};

export const getStoredMoodId = (): MoodId => {
  if (typeof window === "undefined") return DEFAULT_MOOD_ID;
  const stored = localStorage.getItem("mood-theme");
  return resolveMoodId(stored);
};

export const applyMoodVisuals = (id: MoodId | string) => {
  if (typeof window === "undefined") return;
  const resolvedId = resolveMoodId(id);
  const profile = moodProfiles[resolvedId];

  localStorage.setItem("mood-theme", resolvedId);
  applyThemeByName(profile.theme);
  window.dispatchEvent(new Event("themeUpdated"));
  window.dispatchEvent(new Event("moodUpdated"));
};

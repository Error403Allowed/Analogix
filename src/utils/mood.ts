export const moodProfiles = {
  focused: {
    label: "Focused",
    theme: "Classic Blue",
    aiTone: "clear, calm, precise",
    aiStyle: "Keep responses structured, concise, and step-by-step. Minimise fluff.",
    quizStyle: "Rigorous, concept-first questions with clean phrasing.",
    bannerStyle: "steady, goal-oriented, and confident",
    greetingStyle: "calm and purposeful",
    dashboard: {
      primaryCta: "Start Focus Session",
      secondaryCta: "Custom Quiz",
      tutorTitle: "Tutor",
      tutorSubtitle: "Focused mode online",
      calendarTitle: "Your Calendar",
      deadlinesTitle: "Upcoming Deadlines",
      achievementsTitle: "Achievements",
      streakSubtitle: "Keep it up!",
      conversationsFallback: "Stay on track with a chat",
      quizSubtitle: "Last 30 days",
      achievementsEmpty: "Earn badges by studying!"
    },
    visuals: {
      radius: "1.5rem",
      blur: "20px",
      glassOpacity: "0.4",
      borderOpacity: "0.1",
      fontWeight: "500"
    }
  },
  energized: {
    label: "Energized",
    theme: "Sunset Ember",
    aiTone: "high-energy, punchy, motivating",
    aiStyle: "Use short, lively sentences and action verbs. Keep momentum.",
    quizStyle: "Fast-paced, upbeat questions with snappy prompts.",
    bannerStyle: "bold, energetic, and action-driven",
    greetingStyle: "energised and punchy",
    dashboard: {
      primaryCta: "Start Power Session",
      secondaryCta: "Custom Quiz",
      tutorTitle: "Hype Tutor",
      tutorSubtitle: "Energy up and ready",
      calendarTitle: "Today’s Sprint",
      deadlinesTitle: "Next Up",
      achievementsTitle: "Wins",
      streakSubtitle: "Keep the fire burning",
      conversationsFallback: "Spark a quick chat",
      quizSubtitle: "Fast wins, last 30 days",
      achievementsEmpty: "Grab your first win!"
    },
    visuals: {
      radius: "2.5rem",
      blur: "10px",
      glassOpacity: "0.6",
      borderOpacity: "0.2",
      fontWeight: "800"
    }
  },
  chill: {
    label: "Chill",
    theme: "Oceanic",
    aiTone: "relaxed, warm, unhurried",
    aiStyle: "Use gentle phrasing and a soothing cadence. Avoid pressure.",
    quizStyle: "Low-pressure, friendly questions with supportive hints.",
    bannerStyle: "easygoing, calming, and friendly",
    greetingStyle: "soft and relaxed",
    dashboard: {
      primaryCta: "Start Chill Session",
      secondaryCta: "Custom Quiz",
      tutorTitle: "Chill Tutor",
      tutorSubtitle: "Relaxed and ready",
      calendarTitle: "Calm Plan",
      deadlinesTitle: "Coming Up",
      achievementsTitle: "Moments",
      streakSubtitle: "Steady and smooth",
      conversationsFallback: "Slow chat, big clarity",
      quizSubtitle: "No rush, last 30 days",
      achievementsEmpty: "Easy wins await"
    },
    visuals: {
      radius: "3.5rem",
      blur: "40px",
      glassOpacity: "0.3",
      borderOpacity: "0.05",
      fontWeight: "400"
    }
  },
  tired: {
    label: "Tired",
    theme: "Sunset Ember",
    aiTone: "gentle, low-energy, supportive",
    aiStyle: "Keep responses short, reassuring, and low-effort to read. Encourage light, manageable learning without telling the student to stop or leave.",
    quizStyle: "Simple, low-cognitive-load questions with clear wording.",
    bannerStyle: "supportive, gentle, and reassuring; encourage light progress",
    greetingStyle: "gentle, caring, and encouraging light learning",
    dashboard: {
      primaryCta: "Start Easy Session",
      secondaryCta: "Custom Quiz",
      tutorTitle: "Gentle Tutor",
      tutorSubtitle: "Keep it light today",
      calendarTitle: "Light Plan",
      deadlinesTitle: "Take It Easy",
      achievementsTitle: "Small Wins",
      streakSubtitle: "Small steps count",
      conversationsFallback: "Short chat, clear help",
      quizSubtitle: "Short and sweet",
      achievementsEmpty: "Small wins start here"
    },
    visuals: {
      radius: "2rem",
      blur: "60px",
      glassOpacity: "0.2",
      borderOpacity: "0.03",
      fontWeight: "300"
    }
  },
  creative: {
    label: "Creative",
    theme: "Cosmic Aurora",
    aiTone: "imaginative, playful, curious",
    aiStyle: "Use vivid imagery and playful analogies while staying accurate.",
    quizStyle: "Inventive prompts that invite creative thinking.",
    bannerStyle: "curious, playful, and idea-rich",
    greetingStyle: "playful and curious",
    dashboard: {
      primaryCta: "Start Idea Session",
      secondaryCta: "Custom Quiz",
      tutorTitle: "Idea Tutor",
      tutorSubtitle: "Let’s explore new angles",
      calendarTitle: "Idea Map",
      deadlinesTitle: "Upcoming Sparks",
      achievementsTitle: "Highlights",
      streakSubtitle: "Keep the ideas flowing",
      conversationsFallback: "Brainstorm a quick chat",
      quizSubtitle: "Creative gains, last 30 days",
      achievementsEmpty: "Create your first highlight"
    },
    visuals: {
      radius: "3rem",
      blur: "15px",
      glassOpacity: "0.5",
      borderOpacity: "0.15",
      fontWeight: "600"
    }
  },
  productive: {
    label: "Productive",
    theme: "Midnight Gold",
    aiTone: "crisp, efficient, goal-oriented",
    aiStyle: "Be direct and actionable. Emphasise next steps and clarity.",
    quizStyle: "Targeted, efficient questions that reinforce mastery.",
    bannerStyle: "efficient, focused, and progress-driven",
    greetingStyle: "concise and goal-driven",
    dashboard: {
      primaryCta: "Start Deep Work",
      secondaryCta: "Custom Quiz",
      tutorTitle: "Focus Tutor",
      tutorSubtitle: "Let’s get results",
      calendarTitle: "Execution Plan",
      deadlinesTitle: "Priority Deadlines",
      achievementsTitle: "Progress",
      streakSubtitle: "Keep the streak rolling",
      conversationsFallback: "Quick clarity chat",
      quizSubtitle: "Progress, last 30 days",
      achievementsEmpty: "Start your progress log"
    },
    visuals: {
      radius: "1.25rem",
      blur: "5px",
      glassOpacity: "0.7",
      borderOpacity: "0.25",
      fontWeight: "700"
    }
  },
  excited: {
    label: "Excited",
    theme: "Cyber Neon",
    aiTone: "enthusiastic, upbeat, confident",
    aiStyle: "Use lively phrasing and momentum, but keep it clear.",
    quizStyle: "Dynamic questions with punchy prompts.",
    bannerStyle: "bold, upbeat, and energetic",
    greetingStyle: "upbeat and lively",
    dashboard: {
      primaryCta: "Start Sprint",
      secondaryCta: "Custom Quiz",
      tutorTitle: "Hype Tutor",
      tutorSubtitle: "Big energy, big ideas",
      calendarTitle: "Sprint Plan",
      deadlinesTitle: "Next Milestones",
      achievementsTitle: "Milestones",
      streakSubtitle: "Keep the momentum",
      conversationsFallback: "Jump into a chat",
      quizSubtitle: "Momentum, last 30 days",
      achievementsEmpty: "Hit your first milestone"
    },
    visuals: {
      radius: "4rem",
      blur: "0px",
      glassOpacity: "0.8",
      borderOpacity: "0.4",
      fontWeight: "900"
    }
  },
  balanced: {
    label: "Balanced",
    theme: "Forest Glow",
    aiTone: "steady, composed, encouraging",
    aiStyle: "Keep a calm, even tone with clear explanations.",
    quizStyle: "Well-rounded questions with balanced difficulty.",
    bannerStyle: "steady, confident, and supportive",
    greetingStyle: "steady and encouraging",
    dashboard: {
      primaryCta: "Start Steady Session",
      secondaryCta: "Custom Quiz",
      tutorTitle: "Steady Tutor",
      tutorSubtitle: "Calm, clear, ready",
      calendarTitle: "Balanced Plan",
      deadlinesTitle: "Upcoming Steps",
      achievementsTitle: "Steady Wins",
      streakSubtitle: "Consistency wins",
      conversationsFallback: "Keep a steady chat",
      quizSubtitle: "Consistent progress",
      achievementsEmpty: "Build your steady wins"
    },
    visuals: {
      radius: "2.5rem",
      blur: "25px",
      glassOpacity: "0.45",
      borderOpacity: "0.12",
      fontWeight: "500"
    }
  }
} as const;

export type MoodId = keyof typeof moodProfiles;

export const resolveMoodId = (value?: string): MoodId => {
  if (value && value in moodProfiles) {
    return value as MoodId;
  }
  return "focused";
};

export const getMoodProfile = (value?: string) => moodProfiles[resolveMoodId(value)];

export const applyMoodVisuals = (moodId: MoodId) => {
  const profile = moodProfiles[moodId];
  const root = document.documentElement;
  
  root.style.setProperty("--radius", profile.visuals.radius);
  root.style.setProperty("--blur", profile.visuals.blur);
  root.style.setProperty("--glass-opacity", profile.visuals.glassOpacity);
  root.style.setProperty("--border-opacity", profile.visuals.borderOpacity);
  root.style.setProperty("--font-weight-display", profile.visuals.fontWeight);
  
  // Dispatch event for components that might need to react
  window.dispatchEvent(new Event("moodVisualsUpdated"));
};

export const getStoredMoodId = (): MoodId => {
  try {
    return resolveMoodId(localStorage.getItem("mood-theme") || "focused");
  } catch {
    return "focused";
  }
};

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
    }
  },
  energized: {
    label: "Energized",
    theme: "Candy Pop",
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
      calendarTitle: "Gentle Plan",
      deadlinesTitle: "Coming Up",
      achievementsTitle: "Moments",
      streakSubtitle: "Steady and smooth",
      conversationsFallback: "Slow chat, big clarity",
      quizSubtitle: "No rush, last 30 days",
      achievementsEmpty: "Easy wins await"
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

export const getStoredMoodId = (): MoodId => {
  try {
    return resolveMoodId(localStorage.getItem("mood-theme") || "focused");
  } catch {
    return "focused";
  }
};

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "starter" | "streak" | "mastery" | "social";
  condition?: (stats: any) => boolean;
}

export const ACHIEVEMENTS_LIBRARY: Achievement[] = [
  // STARTER
  { id: "start_1", title: "New Beginnings", description: "Complete the onboarding process", icon: "🌱", category: "starter" },
  { id: "start_2", title: "Identity Crisis", description: "Set your own username", icon: "🆔", category: "starter" },
  
  // STREAKS
  { id: "streak_3", title: "Heating Up", description: "Reach a 3-day streak", icon: "🔥", category: "streak" },
  { id: "streak_7", title: "On Fire", description: "Reach a 7-day streak", icon: "🌋", category: "streak" },
  { id: "streak_30", title: "Unstoppable", description: "Reach a 30-day streak", icon: "🚀", category: "streak" },
  
  // MASTERY
  { id: "quiz_1", title: "First Steps", description: "Complete your first quiz", icon: "📝", category: "mastery" },
  { id: "quiz_10", title: "Decathelete", description: "Complete 10 quizzes", icon: "🏅", category: "mastery" },
  { id: "quiz_100", title: "Century Club", description: "Complete 100 quizzes", icon: "💯", category: "mastery" },
  { id: "perfect_score", title: "Perfectionist", description: "Get 100% on a quiz", icon: "🎯", category: "mastery" },
  
  // SOCIAL / MISC
  { id: "chat_1", title: "Hello World", description: "Send a message to Quizzy", icon: "👋", category: "social" },
  { id: "mood_1", title: "Vibe Checker", description: "Track your mood once", icon: "😎", category: "starter" },
];

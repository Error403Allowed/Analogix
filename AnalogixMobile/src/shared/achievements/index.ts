import type { Achievement } from "../types/achievement";

const getSubjectCount = (stats: any) => Object.keys(stats?.subjectCounts || {}).length;
const getTopSubjectCount = (stats: any) => {
  const counts = Object.values(stats?.subjectCounts || {});
  if (counts.length === 0) return 0;
  return Math.max(...counts.map((value) => Number(value) || 0));
};

export const ACHIEVEMENTS: Achievement[] = [
  // STARTER
  { id: "start_1", title: "New Beginnings", description: "Complete the onboarding process", icon: "leaf", category: "starter" },
  { id: "start_2", title: "Identity Check", description: "Set your own username", icon: "account", category: "starter" },
  { id: "special_first", title: "Milestone", description: "Unlock your first achievement", icon: "gift", category: "starter" },

  // STREAKS
  { id: "streak_1", title: "First Spark", description: "Reach a 1-day streak", icon: "fire", category: "streak", condition: (stats) => stats.currentStreak >= 1 },
  { id: "streak_3", title: "Heating Up", description: "Reach a 3-day streak", icon: "fire", category: "streak", condition: (stats) => stats.currentStreak >= 3 },
  { id: "streak_5", title: "Steady Ember", description: "Reach a 5-day streak", icon: "fire", category: "streak", condition: (stats) => stats.currentStreak >= 5 },
  { id: "streak_7", title: "On Fire", description: "Reach a 7-day streak", icon: "fire", category: "streak", condition: (stats) => stats.currentStreak >= 7 },
  { id: "streak_14", title: "Two-Week Run", description: "Reach a 14-day streak", icon: "fire", category: "streak", condition: (stats) => stats.currentStreak >= 14 },
  { id: "streak_21", title: "Habit Formed", description: "Reach a 21-day streak", icon: "fire", category: "streak", condition: (stats) => stats.currentStreak >= 21 },
  { id: "streak_30", title: "Unstoppable", description: "Reach a 30-day streak", icon: "rocket", category: "streak", condition: (stats) => stats.currentStreak >= 30 },
  { id: "streak_45", title: "On a Roll", description: "Reach a 45-day streak", icon: "rocket", category: "streak", condition: (stats) => stats.currentStreak >= 45 },
  { id: "streak_60", title: "Momentum", description: "Reach a 60-day streak", icon: "rocket", category: "streak", condition: (stats) => stats.currentStreak >= 60 },
  { id: "streak_90", title: "Quarter-Year", description: "Reach a 90-day streak", icon: "rocket", category: "streak", condition: (stats) => stats.currentStreak >= 90 },
  { id: "streak_120", title: "Seasoned", description: "Reach a 120-day streak", icon: "rocket", category: "streak", condition: (stats) => stats.currentStreak >= 120 },
  { id: "streak_180", title: "Half-Year Hero", description: "Reach a 180-day streak", icon: "rocket", category: "streak", condition: (stats) => stats.currentStreak >= 180 },
  { id: "streak_365", title: "Year-Long Legend", description: "Reach a 365-day streak", icon: "rocket", category: "streak", condition: (stats) => stats.currentStreak >= 365 },

  // QUIZ MASTERY
  { id: "quiz_1", title: "First Steps", description: "Complete your first quiz", icon: "clipboard-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 1 },
  { id: "quiz_5", title: "Warming Up", description: "Complete 5 quizzes", icon: "clipboard-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 5 },
  { id: "quiz_10", title: "Decathlete", description: "Complete 10 quizzes", icon: "medal", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 10 },
  { id: "quiz_25", title: "Quarter Stack", description: "Complete 25 quizzes", icon: "medal", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 25 },
  { id: "quiz_50", title: "Half Century", description: "Complete 50 quizzes", icon: "medal", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 50 },
  { id: "quiz_75", title: "Three Quarters", description: "Complete 75 quizzes", icon: "medal", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 75 },
  { id: "quiz_100", title: "Century Club", description: "Complete 100 quizzes", icon: "badge-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 100 },
  { id: "quiz_150", title: "Milestone 150", description: "Complete 150 quizzes", icon: "badge-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 150 },
  { id: "quiz_200", title: "Double Century", description: "Complete 200 quizzes", icon: "badge-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 200 },
  { id: "quiz_300", title: "Triple Threat", description: "Complete 300 quizzes", icon: "badge-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 300 },
  { id: "quiz_500", title: "Quiz Legend", description: "Complete 500 quizzes", icon: "badge-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 500 },

  // ACCURACY
  { id: "accuracy_80", title: "Sharp Aim", description: "Maintain 80% accuracy over 5+ quizzes", icon: "target", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 5 && stats.accuracy >= 80 },
  { id: "accuracy_90", title: "Dead Center", description: "Maintain 90% accuracy over 5+ quizzes", icon: "target", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 5 && stats.accuracy >= 90 },
  { id: "accuracy_95", title: "Pinpoint", description: "Maintain 95% accuracy over 10+ quizzes", icon: "target", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 10 && stats.accuracy >= 95 },
  { id: "perfect_score", title: "Perfectionist", description: "Get 100% on a quiz", icon: "target", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 1 && stats.accuracy >= 100 },

  // CHAT / SOCIAL
  { id: "chat_1", title: "Hello World", description: "Send a message to Analogix AI", icon: "message-text", category: "social", condition: (stats) => (stats.conversationsCount ?? 0) >= 1 },
  { id: "chat_5", title: "Talkative", description: "Have 5 conversations", icon: "message-text", category: "social", condition: (stats) => (stats.conversationsCount ?? 0) >= 5 },
  { id: "chat_10", title: "Chat Regular", description: "Have 10 conversations", icon: "message-text", category: "social", condition: (stats) => (stats.conversationsCount ?? 0) >= 10 },
  { id: "chat_25", title: "Conversation Streak", description: "Have 25 conversations", icon: "message-text", category: "social", condition: (stats) => (stats.conversationsCount ?? 0) >= 25 },
  { id: "chat_50", title: "Social Scholar", description: "Have 50 conversations", icon: "message-text", category: "social", condition: (stats) => (stats.conversationsCount ?? 0) >= 50 },
  { id: "chat_100", title: "Centurion Chat", description: "Have 100 conversations", icon: "message-text", category: "social", condition: (stats) => (stats.conversationsCount ?? 0) >= 100 },
  { id: "chat_200", title: "Dialogue Pro", description: "Have 200 conversations", icon: "message-text", category: "social", condition: (stats) => (stats.conversationsCount ?? 0) >= 200 },
  { id: "chat_500", title: "Talk Marathon", description: "Have 500 conversations", icon: "message-text", category: "social", condition: (stats) => (stats.conversationsCount ?? 0) >= 500 },
  { id: "chat_1000", title: "Legendary Listener", description: "Have 1000 conversations", icon: "message-text", category: "social", condition: (stats) => (stats.conversationsCount ?? 0) >= 1000 },

  // DIVERSITY
  { id: "diverse_2", title: "Two Topics", description: "Explore 2 different subjects", icon: "badge-check", category: "mastery", condition: (stats) => getSubjectCount(stats) >= 2 },
  { id: "diverse_3", title: "Explorer", description: "Explore 3 different subjects", icon: "badge-check", category: "mastery", condition: (stats) => getSubjectCount(stats) >= 3 },
  { id: "diverse_5", title: "Wide Net", description: "Explore 5 different subjects", icon: "badge-check", category: "mastery", condition: (stats) => getSubjectCount(stats) >= 5 },
  { id: "diverse_8", title: "Polymath", description: "Explore 8 different subjects", icon: "badge-check", category: "mastery", condition: (stats) => getSubjectCount(stats) >= 8 },
  { id: "diverse_10", title: "Renaissance", description: "Explore 10 different subjects", icon: "badge-check", category: "mastery", condition: (stats) => getSubjectCount(stats) >= 10 },

  // SPECIALIST
  { id: "specialist_20", title: "Focused Mind", description: "Have 20 chats in a single subject", icon: "medal", category: "mastery", condition: (stats) => getTopSubjectCount(stats) >= 20 },
  { id: "specialist_50", title: "Deep Diver", description: "Have 50 chats in a single subject", icon: "medal", category: "mastery", condition: (stats) => getTopSubjectCount(stats) >= 50 },

  // BALANCED PROGRESS
  { id: "balanced_5_5", title: "Balanced Learner", description: "Complete 5 quizzes and 5 chats", icon: "badge-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 5 && (stats.conversationsCount ?? 0) >= 5 },
  { id: "balanced_10_10", title: "Dual Track", description: "Complete 10 quizzes and 10 chats", icon: "badge-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 10 && (stats.conversationsCount ?? 0) >= 10 },
  { id: "balanced_25_10", title: "Practice + Talk", description: "Complete 25 quizzes and 10 chats", icon: "badge-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 25 && (stats.conversationsCount ?? 0) >= 10 },
  { id: "balanced_50_25", title: "Well Rounded", description: "Complete 50 quizzes and 25 chats", icon: "badge-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 50 && (stats.conversationsCount ?? 0) >= 25 },
  { id: "balanced_100_50", title: "Committed", description: "Complete 100 quizzes and 50 chats", icon: "badge-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 100 && (stats.conversationsCount ?? 0) >= 50 },
  { id: "balanced_200_100", title: "Master Planner", description: "Complete 200 quizzes and 100 chats", icon: "badge-check", category: "mastery", condition: (stats) => (stats.quizzesDone ?? stats.quizzesCompleted ?? 0) >= 200 && (stats.conversationsCount ?? 0) >= 100 },

  // STUDY TIME
  { id: "time_30", title: "Half Hour", description: "Study for 30 minutes total", icon: "clock", category: "mastery", condition: (stats) => (stats.minutesStudied ?? stats.totalStudyTimeMinutes ?? 0) >= 30 },
  { id: "time_60", title: "First Hour", description: "Study for 1 hour total", icon: "clock", category: "mastery", condition: (stats) => (stats.minutesStudied ?? stats.totalStudyTimeMinutes ?? 0) >= 60 },
  { id: "time_120", title: "Two Hour Tour", description: "Study for 2 hours total", icon: "clock", category: "mastery", condition: (stats) => (stats.minutesStudied ?? stats.totalStudyTimeMinutes ?? 0) >= 120 },
  { id: "time_300", title: "Five Hour Focus", description: "Study for 5 hours total", icon: "clock", category: "mastery", condition: (stats) => (stats.minutesStudied ?? stats.totalStudyTimeMinutes ?? 0) >= 300 },
  { id: "time_500", title: "Dedicated", description: "Study for 10 hours total", icon: "clock", category: "mastery", condition: (stats) => (stats.minutesStudied ?? stats.totalStudyTimeMinutes ?? 0) >= 500 },
  { id: "time_1000", title: "Century of Learning", description: "Study for 1000 minutes total", icon: "clock", category: "mastery", condition: (stats) => (stats.minutesStudied ?? stats.totalStudyTimeMinutes ?? 0) >= 1000 },
  { id: "time_3000", title: "Time Master", description: "Study for 50 hours total", icon: "clock", category: "mastery", condition: (stats) => (stats.minutesStudied ?? stats.totalStudyTimeMinutes ?? 0) >= 3000 },

  // DOCUMENTS
  { id: "doc_1", title: "First Note", description: "Create your first document", icon: "file-text", category: "mastery", condition: (stats) => (stats.documentsCreated ?? 0) >= 1 },
  { id: "doc_5", title: "Note Taker", description: "Create 5 documents", icon: "file-text", category: "mastery", condition: (stats) => (stats.documentsCreated ?? 0) >= 5 },
  { id: "doc_10", title: "Documented", description: "Create 10 documents", icon: "file-text", category: "mastery", condition: (stats) => (stats.documentsCreated ?? 0) >= 10 },
  { id: "doc_25", title: "Archive Builder", description: "Create 25 documents", icon: "file-text", category: "mastery", condition: (stats) => (stats.documentsCreated ?? 0) >= 25 },
  { id: "doc_50", title: "Librarian", description: "Create 50 documents", icon: "file-text", category: "mastery", condition: (stats) => (stats.documentsCreated ?? 0) >= 50 },
  { id: "doc_100", title: "Document Master", description: "Create 100 documents", icon: "file-text", category: "mastery", condition: (stats) => (stats.documentsCreated ?? 0) >= 100 },

  // STUDY GUIDES
  { id: "guide_1", title: "Guide Creator", description: "Create your first study guide", icon: "book-open", category: "mastery", condition: (stats) => (stats.studyGuidesCreated ?? 0) >= 1 },
  { id: "guide_3", title: "Guide Collector", description: "Create 3 study guides", icon: "book-open", category: "mastery", condition: (stats) => (stats.studyGuidesCreated ?? 0) >= 3 },
  { id: "guide_5", title: "Study Expert", description: "Create 5 study guides", icon: "book-open", category: "mastery", condition: (stats) => (stats.studyGuidesCreated ?? 0) >= 5 },
  { id: "guide_10", title: "Guide Master", description: "Create 10 study guides", icon: "book-open", category: "mastery", condition: (stats) => (stats.studyGuidesCreated ?? 0) >= 10 },

  // FLASHCARDS
  { id: "flash_1", title: "First Card", description: "Create your first flashcard", icon: "brain", category: "mastery", condition: (stats) => (stats.flashcardsCreated ?? stats.cardsReviewed ?? 0) >= 1 },
  { id: "flash_10", title: "Card Starter", description: "Create 10 flashcards", icon: "brain", category: "mastery", condition: (stats) => (stats.flashcardsCreated ?? stats.cardsReviewed ?? 0) >= 10 },
  { id: "flash_50", title: "Flash Master", description: "Create 50 flashcards", icon: "brain", category: "mastery", condition: (stats) => (stats.flashcardsCreated ?? stats.cardsReviewed ?? 0) >= 50 },
  { id: "flash_100", title: "Card Collector", description: "Create 100 flashcards", icon: "brain", category: "mastery", condition: (stats) => (stats.flashcardsCreated ?? stats.cardsReviewed ?? 0) >= 100 },
  { id: "flash_250", title: "Flash Legend", description: "Create 250 flashcards", icon: "brain", category: "mastery", condition: (stats) => (stats.flashcardsCreated ?? stats.cardsReviewed ?? 0) >= 250 },

  // PERFECT SCORES
  { id: "perfect_1", title: "Flawless", description: "Get 1 perfect quiz score", icon: "trophy", category: "mastery", condition: (stats) => (stats.perfectQuizzes ?? 0) >= 1 },
  { id: "perfect_3", title: "Triple Perfect", description: "Get 3 perfect quiz scores", icon: "trophy", category: "mastery", condition: (stats) => (stats.perfectQuizzes ?? 0) >= 3 },
  { id: "perfect_5", title: "Five Star", description: "Get 5 perfect quiz scores", icon: "trophy", category: "mastery", condition: (stats) => (stats.perfectQuizzes ?? 0) >= 5 },
  { id: "perfect_10", title: "Perfect Ten", description: "Get 10 perfect quiz scores", icon: "trophy", category: "mastery", condition: (stats) => (stats.perfectQuizzes ?? 0) >= 10 },

  // EARLY BIRD / NIGHT OWL
  { id: "early_1", title: "Early Bird", description: "Study before 8 AM", icon: "weather-sunny", category: "mastery", condition: (stats) => (stats.earlyMorningSessions ?? 0) >= 1 },
  { id: "early_5", title: "Rising Star", description: "Study before 8 AM five times", icon: "weather-sunny", category: "mastery", condition: (stats) => (stats.earlyMorningSessions ?? 0) >= 5 },
  { id: "early_10", title: "Dawn Scholar", description: "Study before 8 AM ten times", icon: "weather-sunny", category: "mastery", condition: (stats) => (stats.earlyMorningSessions ?? 0) >= 10 },
  { id: "night_1", title: "Night Owl", description: "Study after 10 PM", icon: "weather-night", category: "mastery", condition: (stats) => (stats.lateNightSessions ?? 0) >= 1 },
  { id: "night_5", title: "Midnight Scholar", description: "Study after 10 PM five times", icon: "weather-night", category: "mastery", condition: (stats) => (stats.lateNightSessions ?? 0) >= 5 },
  { id: "night_10", title: "Nocturnal Genius", description: "Study after 10 PM ten times", icon: "weather-night", category: "mastery", condition: (stats) => (stats.lateNightSessions ?? 0) >= 10 },

  // WEEKEND WARRIOR
  { id: "weekend_1", title: "Weekend Warrior", description: "Study on a weekend", icon: "calendar", category: "mastery", condition: (stats) => (stats.weekendSessions ?? 0) >= 1 },
  { id: "weekend_5", title: "Saturday Scholar", description: "Study on weekends 5 times", icon: "calendar", category: "mastery", condition: (stats) => (stats.weekendSessions ?? 0) >= 5 },
  { id: "weekend_10", title: "Weekend Dedicated", description: "Study on weekends 10 times", icon: "calendar", category: "mastery", condition: (stats) => (stats.weekendSessions ?? 0) >= 10 },

  // CALENDAR
  { id: "calendar_1", title: "Planner", description: "Add your first calendar event", icon: "calendar-plus", category: "mastery", condition: (stats) => (stats.calendarEventsCreated ?? 0) >= 1 },
  { id: "calendar_5", title: "Organized", description: "Add 5 calendar events", icon: "calendar-plus", category: "mastery", condition: (stats) => (stats.calendarEventsCreated ?? 0) >= 5 },
  { id: "calendar_10", title: "Schedule Master", description: "Add 10 calendar events", icon: "calendar-plus", category: "mastery", condition: (stats) => (stats.calendarEventsCreated ?? 0) >= 10 },
  { id: "calendar_25", title: "Time Manager", description: "Add 25 calendar events", icon: "calendar-plus", category: "mastery", condition: (stats) => (stats.calendarEventsCreated ?? 0) >= 25 },

  // AI POWER USER
  { id: "ai_1", title: "AI Curious", description: "Use an AI power feature", icon: "auto-fix", category: "mastery", condition: (stats) => (stats.aiPowerUses ?? 0) >= 1 },
  { id: "ai_5", title: "AI Assistant", description: "Use AI power features 5 times", icon: "auto-fix", category: "mastery", condition: (stats) => (stats.aiPowerUses ?? 0) >= 5 },
  { id: "ai_10", title: "AI Enhanced", description: "Use AI power features 10 times", icon: "auto-fix", category: "mastery", condition: (stats) => (stats.aiPowerUses ?? 0) >= 10 },
  { id: "ai_25", title: "AI Partner", description: "Use AI power features 25 times", icon: "auto-fix", category: "mastery", condition: (stats) => (stats.aiPowerUses ?? 0) >= 25 },
  { id: "ai_50", title: "AI Master", description: "Use AI power features 50 times", icon: "auto-fix", category: "mastery", condition: (stats) => (stats.aiPowerUses ?? 0) >= 50 },

  // SPECIAL
  { id: "special_10", title: "Achievement Hunter", description: "Unlock 10 achievements", icon: "party-popper", category: "mastery" },
  { id: "special_25", title: "Badge Collector", description: "Unlock 25 achievements", icon: "party-popper", category: "mastery" },
  { id: "special_50", title: "Trophy Case", description: "Unlock 50 achievements", icon: "crown", category: "mastery" },
  { id: "special_all", title: "Completionist", description: "Unlock all achievements", icon: "crown", category: "mastery" },

  // IMPROVEMENT
  { id: "improve_10", title: "Quick Learner", description: "Improve quiz score by 10%", icon: "star", category: "mastery" },
  { id: "improve_25", title: "Major Glow Up", description: "Improve quiz score by 25%", icon: "star", category: "mastery" },
  { id: "improve_50", title: "Transformation", description: "Improve quiz score by 50%", icon: "star", category: "mastery" },

  // COMEBACK
  { id: "comeback_1", title: "Back in Action", description: "Return after a 7+ day break", icon: "heart", category: "mastery" },
  { id: "comeback_2", title: "Phoenix", description: "Return after a 14+ day break", icon: "fire", category: "mastery" },
  { id: "comeback_3", title: "Unstoppable Return", description: "Return after a 30+ day break", icon: "rocket", category: "mastery" },

  // SPEED
  { id: "speed_1", title: "Speed Demon", description: "Complete a quiz in under 2 minutes", icon: "lightning-bolt", category: "mastery" },
  { id: "speed_5", title: "Lightning Fast", description: "Complete 5 quizzes in under 2 minutes each", icon: "lightning-bolt", category: "mastery" },

  // ENDURANCE
  { id: "endurance_30", title: "Marathon Session", description: "Study for 30 minutes in one session", icon: "clock", category: "mastery" },
  { id: "endurance_60", title: "Deep Focus", description: "Study for 60 minutes in one session", icon: "clock", category: "mastery" },
  { id: "endurance_120", title: "Ultra Focus", description: "Study for 120 minutes in one session", icon: "clock", category: "mastery" },

  // GRADUATION
  { id: "grad_1", title: "First Grade", description: "Complete a graded assessment", icon: "school", category: "mastery" },
  { id: "grad_5", title: "Graded Five", description: "Complete 5 graded assessments", icon: "school", category: "mastery" },
  { id: "grad_10", title: "Assessment Pro", description: "Complete 10 graded assessments", icon: "school", category: "mastery" },
  { id: "grad_a", title: "A Student", description: "Get an A grade on an assessment", icon: "school", category: "mastery" },
  { id: "grad_all_a", title: "Honor Roll", description: "Get A grades on 5 assessments", icon: "school", category: "mastery" },

  // WRITING
  { id: "write_1000", title: "First Thousand", description: "Write 1000 words of notes", icon: "pen", category: "mastery", condition: (stats) => (stats.notesWritten ?? 0) >= 1000 },
  { id: "write_5000", title: "Prolific Writer", description: "Write 5000 words of notes", icon: "pen", category: "mastery", condition: (stats) => (stats.notesWritten ?? 0) >= 5000 },
  { id: "write_10000", title: "Author", description: "Write 10000 words of notes", icon: "pen", category: "mastery", condition: (stats) => (stats.notesWritten ?? 0) >= 10000 },
  { id: "write_25000", title: "Novelist", description: "Write 25000 words of notes", icon: "pen", category: "mastery", condition: (stats) => (stats.notesWritten ?? 0) >= 25000 },

  // INSIGHT
  { id: "insight_1", title: "Lightbulb Moment", description: "Have an 'aha!' moment with AI", icon: "lightbulb", category: "social" },
  { id: "insight_5", title: "Deep Understanding", description: "Have 5 'aha!' moments", icon: "lightbulb", category: "social" },
  { id: "insight_10", title: "Enlightened", description: "Have 10 'aha!' moments", icon: "lightbulb", category: "social" },
];

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAchievementsByCategory(category: Achievement["category"]): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

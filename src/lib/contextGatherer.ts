// Context gathering utilities for AI agent
// Collects relevant information from different parts of the app

import { eventStore } from "@/utils/eventStore";
import { statsStore } from "@/utils/statsStore";
import { subjectStore } from "@/utils/subjectStore";
import { flashcardStore } from "@/utils/flashcardStore";

export interface ContextOptions {
  includeRecentDocs?: boolean;
  includeEvents?: boolean;
  includeStats?: boolean;
  includeFlashcards?: boolean;
  includeAchievements?: boolean;
}

export interface AppContext {
  currentPath?: string;
  subjects?: string[];
  recentDocuments?: Array<{ title: string; subject: string; lastUpdated: string }>;
  upcomingEvents?: Array<{ title: string; date: string; type: string }>;
  stats?: {
    studyStreak?: number;
    quizzesCompleted?: number;
    averageScore?: number;
  };
  flashcards?: {
    total?: number;
    dueToday?: number;
  };
  achievements?: Array<{ title: string; description: string; unlocked: boolean }>;
}

export async function gatherAppContext(path?: string, options: ContextOptions = {}): Promise<AppContext> {
  const context: AppContext = {
    currentPath: path || window?.location?.pathname,
  };

  try {
    // Gather user preferences
    const userPrefs = typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {};
    context.subjects = userPrefs.subjects || [];

    // Attach personal profile to context parts
    const profileParts: string[] = [];
    if (userPrefs.name) profileParts.push(`Name: ${userPrefs.name}`);
    if (userPrefs.grade) profileParts.push(`Year: ${userPrefs.grade}`);
    if (userPrefs.state) profileParts.push(`State: ${userPrefs.state}`);
    if (userPrefs.hobbies?.length) profileParts.push(`Interests/hobbies: ${userPrefs.hobbies.join(", ")}`);
    if (profileParts.length) {
      // @ts-ignore
      context._profileSummary = profileParts.join(", ");
    }

    if (options.includeRecentDocs !== false) {
      // Gather recent documents from all subjects
      const allSubjects = await subjectStore.getAll();
      const recentDocs: AppContext["recentDocuments"] = [];
      Object.entries(allSubjects).forEach(([subjectId, data]) => {
        (data.notes.documents || []).slice(0, 3).forEach(doc => {
          recentDocs.push({
            title: doc.title || "Untitled",
            subject: subjectId,
            lastUpdated: doc.lastUpdated || data.notes.lastUpdated || "",
          });
        });
      });
      context.recentDocuments = recentDocs.slice(0, 10);
    }

    if (options.includeEvents !== false) {
      // Gather upcoming events
      const events = await eventStore.getAll();
      const upcoming = events
        .filter(e => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5)
        .map(e => ({
          title: e.title,
          date: new Date(e.date).toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
          type: e.type,
        }));
      context.upcomingEvents = upcoming;
    }

    if (options.includeStats !== false) {
      // Gather stats
      const stats = await statsStore.get();
      context.stats = {
        studyStreak: stats.currentStreak || 0,
        quizzesCompleted: stats.quizzesDone || 0,
        averageScore: stats.accuracy || 0,
      };
    }

    if (options.includeFlashcards !== false) {
      // Gather flashcards info
      const allFlashcards = await flashcardStore.getAll();
      const today = new Date().toISOString().split("T")[0];
      const dueToday = allFlashcards.filter(fc => {
        const nextReview = fc.nextReview?.split("T")[0];
        return nextReview && nextReview <= today;
      }).length;
      context.flashcards = {
        total: allFlashcards.length,
        dueToday,
      };
    }

    if (options.includeAchievements !== false) {
      // Gather achievements (simplified - you can expand this)
      const stats = await statsStore.get(); // Need stats for achievement conditions
      context.achievements = [
        { title: "First Steps", description: "Complete your first study session", unlocked: (stats.currentStreak || 0) >= 1 },
        { title: "On Fire", description: "7 day study streak", unlocked: (stats.currentStreak || 0) >= 7 },
        { title: "Quiz Master", description: "Complete 10 quizzes", unlocked: (stats.quizzesDone || 0) >= 10 },
      ];
    }

  } catch (error) {
    console.error("Error gathering app context:", error);
  }

  return context;
}

// Wrapper for minimal context (current screen + subjects only)
export function gatherLimitedContext(path?: string): Promise<AppContext> {
  return gatherAppContext(path, {
    includeRecentDocs: false,
    includeEvents: false,
    includeStats: false,
    includeFlashcards: false,
    includeAchievements: false,
  });
}

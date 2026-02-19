import type { ReactNode } from "react";
import {
  BadgeCheck,
  ClipboardCheck,
  Flame,
  Leaf,
  Medal,
  MessageSquare,
  Rocket,
  Target,
  User
} from "lucide-react";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  category: "starter" | "streak" | "mastery" | "social";
  condition?: (stats: any) => boolean;
}

const getSubjectCount = (stats: any) => Object.keys(stats?.subjectCounts || {}).length;
const getTopSubjectCount = (stats: any) => {
  const counts = Object.values(stats?.subjectCounts || {});
  if (counts.length === 0) return 0;
  return Math.max(...counts.map((value) => Number(value) || 0));
};

export const ACHIEVEMENTS_LIBRARY: Achievement[] = [
  // STARTER
  { id: "start_1", title: "New Beginnings", description: "Complete the onboarding process", icon: <Leaf className="w-5 h-5" />, category: "starter" },
  { id: "start_2", title: "Identity Check", description: "Set your own username", icon: <User className="w-5 h-5" />, category: "starter" },

  // STREAKS
  { id: "streak_1", title: "First Spark", description: "Reach a 1-day streak", icon: <Flame className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 1 },
  { id: "streak_3", title: "Heating Up", description: "Reach a 3-day streak", icon: <Flame className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 3 },
  { id: "streak_5", title: "Steady Ember", description: "Reach a 5-day streak", icon: <Flame className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 5 },
  { id: "streak_7", title: "On Fire", description: "Reach a 7-day streak", icon: <Flame className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 7 },
  { id: "streak_14", title: "Two-Week Run", description: "Reach a 14-day streak", icon: <Flame className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 14 },
  { id: "streak_21", title: "Habit Formed", description: "Reach a 21-day streak", icon: <Flame className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 21 },
  { id: "streak_30", title: "Unstoppable", description: "Reach a 30-day streak", icon: <Rocket className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 30 },
  { id: "streak_45", title: "On a Roll", description: "Reach a 45-day streak", icon: <Rocket className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 45 },
  { id: "streak_60", title: "Momentum", description: "Reach a 60-day streak", icon: <Rocket className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 60 },
  { id: "streak_90", title: "Quarter-Year", description: "Reach a 90-day streak", icon: <Rocket className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 90 },
  { id: "streak_120", title: "Seasoned", description: "Reach a 120-day streak", icon: <Rocket className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 120 },
  { id: "streak_180", title: "Half-Year Hero", description: "Reach a 180-day streak", icon: <Rocket className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 180 },
  { id: "streak_365", title: "Year-Long Legend", description: "Reach a 365-day streak", icon: <Rocket className="w-5 h-5" />, category: "streak", condition: (stats) => stats.currentStreak >= 365 },

  // QUIZ MASTERY
  { id: "quiz_1", title: "First Steps", description: "Complete your first quiz", icon: <ClipboardCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 1 },
  { id: "quiz_5", title: "Warming Up", description: "Complete 5 quizzes", icon: <ClipboardCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 5 },
  { id: "quiz_10", title: "Decathlete", description: "Complete 10 quizzes", icon: <Medal className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 10 },
  { id: "quiz_25", title: "Quarter Stack", description: "Complete 25 quizzes", icon: <Medal className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 25 },
  { id: "quiz_50", title: "Half Century", description: "Complete 50 quizzes", icon: <Medal className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 50 },
  { id: "quiz_75", title: "Three Quarters", description: "Complete 75 quizzes", icon: <Medal className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 75 },
  { id: "quiz_100", title: "Century Club", description: "Complete 100 quizzes", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 100 },
  { id: "quiz_150", title: "Milestone 150", description: "Complete 150 quizzes", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 150 },
  { id: "quiz_200", title: "Double Century", description: "Complete 200 quizzes", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 200 },
  { id: "quiz_300", title: "Triple Threat", description: "Complete 300 quizzes", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 300 },
  { id: "quiz_500", title: "Quiz Legend", description: "Complete 500 quizzes", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 500 },

  // ACCURACY
  { id: "accuracy_80", title: "Sharp Aim", description: "Maintain 80% accuracy over 5+ quizzes", icon: <Target className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 5 && stats.accuracy >= 80 },
  { id: "accuracy_90", title: "Dead Center", description: "Maintain 90% accuracy over 5+ quizzes", icon: <Target className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 5 && stats.accuracy >= 90 },
  { id: "accuracy_95", title: "Pinpoint", description: "Maintain 95% accuracy over 10+ quizzes", icon: <Target className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 10 && stats.accuracy >= 95 },
  { id: "perfect_score", title: "Perfectionist", description: "Get 100% on a quiz", icon: <Target className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 1 && stats.accuracy >= 100 },

  // CHAT / SOCIAL
  { id: "chat_1", title: "Hello World", description: "Send a message to Quizzy", icon: <MessageSquare className="w-5 h-5" />, category: "social", condition: (stats) => stats.conversationsCount >= 1 },
  { id: "chat_5", title: "Talkative", description: "Have 5 conversations", icon: <MessageSquare className="w-5 h-5" />, category: "social", condition: (stats) => stats.conversationsCount >= 5 },
  { id: "chat_10", title: "Chat Regular", description: "Have 10 conversations", icon: <MessageSquare className="w-5 h-5" />, category: "social", condition: (stats) => stats.conversationsCount >= 10 },
  { id: "chat_25", title: "Conversation Streak", description: "Have 25 conversations", icon: <MessageSquare className="w-5 h-5" />, category: "social", condition: (stats) => stats.conversationsCount >= 25 },
  { id: "chat_50", title: "Social Scholar", description: "Have 50 conversations", icon: <MessageSquare className="w-5 h-5" />, category: "social", condition: (stats) => stats.conversationsCount >= 50 },
  { id: "chat_100", title: "Centurion Chat", description: "Have 100 conversations", icon: <MessageSquare className="w-5 h-5" />, category: "social", condition: (stats) => stats.conversationsCount >= 100 },
  { id: "chat_200", title: "Dialogue Pro", description: "Have 200 conversations", icon: <MessageSquare className="w-5 h-5" />, category: "social", condition: (stats) => stats.conversationsCount >= 200 },
  { id: "chat_500", title: "Talk Marathon", description: "Have 500 conversations", icon: <MessageSquare className="w-5 h-5" />, category: "social", condition: (stats) => stats.conversationsCount >= 500 },
  { id: "chat_1000", title: "Legendary Listener", description: "Have 1000 conversations", icon: <MessageSquare className="w-5 h-5" />, category: "social", condition: (stats) => stats.conversationsCount >= 1000 },

  // DIVERSITY
  { id: "diverse_2", title: "Two Topics", description: "Explore 2 different subjects", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => getSubjectCount(stats) >= 2 },
  { id: "diverse_3", title: "Explorer", description: "Explore 3 different subjects", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => getSubjectCount(stats) >= 3 },
  { id: "diverse_5", title: "Wide Net", description: "Explore 5 different subjects", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => getSubjectCount(stats) >= 5 },
  { id: "diverse_8", title: "Polymath", description: "Explore 8 different subjects", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => getSubjectCount(stats) >= 8 },
  { id: "diverse_10", title: "Renaissance", description: "Explore 10 different subjects", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => getSubjectCount(stats) >= 10 },

  // SPECIALIST
  { id: "specialist_20", title: "Focused Mind", description: "Have 20 chats in a single subject", icon: <Medal className="w-5 h-5" />, category: "mastery", condition: (stats) => getTopSubjectCount(stats) >= 20 },
  { id: "specialist_50", title: "Deep Diver", description: "Have 50 chats in a single subject", icon: <Medal className="w-5 h-5" />, category: "mastery", condition: (stats) => getTopSubjectCount(stats) >= 50 },

  // BALANCED PROGRESS
  { id: "balanced_5_5", title: "Balanced Learner", description: "Complete 5 quizzes and 5 chats", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 5 && stats.conversationsCount >= 5 },
  { id: "balanced_10_10", title: "Dual Track", description: "Complete 10 quizzes and 10 chats", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 10 && stats.conversationsCount >= 10 },
  { id: "balanced_25_10", title: "Practice + Talk", description: "Complete 25 quizzes and 10 chats", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 25 && stats.conversationsCount >= 10 },
  { id: "balanced_50_25", title: "Well Rounded", description: "Complete 50 quizzes and 25 chats", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 50 && stats.conversationsCount >= 25 },
  { id: "balanced_100_50", title: "Committed", description: "Complete 100 quizzes and 50 chats", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 100 && stats.conversationsCount >= 50 },
  { id: "balanced_200_100", title: "Master Planner", description: "Complete 200 quizzes and 100 chats", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery", condition: (stats) => stats.quizzesDone >= 200 && stats.conversationsCount >= 100 },
];

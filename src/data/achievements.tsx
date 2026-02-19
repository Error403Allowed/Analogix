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

export const ACHIEVEMENTS_LIBRARY: Achievement[] = [
  // STARTER
  { id: "start_1", title: "New Beginnings", description: "Complete the onboarding process", icon: <Leaf className="w-5 h-5" />, category: "starter" },
  { id: "start_2", title: "Identity Check", description: "Set your own username", icon: <User className="w-5 h-5" />, category: "starter" },
  
  // STREAKS
  { id: "streak_3", title: "Heating Up", description: "Reach a 3-day streak", icon: <Flame className="w-5 h-5" />, category: "streak" },
  { id: "streak_7", title: "On Fire", description: "Reach a 7-day streak", icon: <Flame className="w-5 h-5" />, category: "streak" },
  { id: "streak_30", title: "Unstoppable", description: "Reach a 30-day streak", icon: <Rocket className="w-5 h-5" />, category: "streak" },
  
  // MASTERY
  { id: "quiz_1", title: "First Steps", description: "Complete your first quiz", icon: <ClipboardCheck className="w-5 h-5" />, category: "mastery" },
  { id: "quiz_10", title: "Decathelete", description: "Complete 10 quizzes", icon: <Medal className="w-5 h-5" />, category: "mastery" },
  { id: "quiz_100", title: "Century Club", description: "Complete 100 quizzes", icon: <BadgeCheck className="w-5 h-5" />, category: "mastery" },
  { id: "perfect_score", title: "Perfectionist", description: "Get 100% on a quiz", icon: <Target className="w-5 h-5" />, category: "mastery" },
  
  // SOCIAL / MISC
  { id: "chat_1", title: "Hello World", description: "Send a message to Quizzy", icon: <MessageSquare className="w-5 h-5" />, category: "social" },
];

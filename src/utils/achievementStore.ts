import { createClient } from "@/lib/supabase/client";
import { ACHIEVEMENTS_LIBRARY, Achievement } from "@/data/achievements";
import { toast } from "sonner";

const LOCAL_KEY = "userAchievements";

interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

export const achievementStore = {
  getUnlocked: async (): Promise<UnlockedAchievement[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user.id);
      if (data) {
        return data.map((row: any) => ({ id: row.achievement_id, unlockedAt: row.unlocked_at }));
      }
    }

    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    } catch { return []; }
  },

  getAll: async (): Promise<(Achievement & { unlocked: boolean; unlockedAt?: string })[]> => {
    const unlocked = await achievementStore.getUnlocked();
    return ACHIEVEMENTS_LIBRARY.map((ach) => {
      const found = unlocked.find((u) => u.id === ach.id);
      return { ...ach, unlocked: !!found, unlockedAt: found?.unlockedAt };
    });
  },

  unlock: async (id: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const unlocked = await achievementStore.getUnlocked();
    if (unlocked.some((u) => u.id === id)) return;

    const achievement = ACHIEVEMENTS_LIBRARY.find((a) => a.id === id);
    if (!achievement) return;

    const now = new Date().toISOString();

    if (user) {
      await supabase.from("achievements").upsert(
        { user_id: user.id, achievement_id: id, unlocked_at: now },
        { onConflict: "user_id,achievement_id" }
      );
    }

    try {
      unlocked.push({ id, unlockedAt: now });
      localStorage.setItem(LOCAL_KEY, JSON.stringify(unlocked));
    } catch {}

    toast.success(`Achievement Unlocked: ${achievement.title}!`, {
      description: achievement.description,
      icon: achievement.icon,
      duration: 5000,
    });

    window.dispatchEvent(new Event("achievementsUpdated"));
  },

  reset: async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("achievements").delete().eq("user_id", user.id);
    }
    try { localStorage.removeItem(LOCAL_KEY); } catch {}
    window.dispatchEvent(new Event("achievementsUpdated"));
  },
};

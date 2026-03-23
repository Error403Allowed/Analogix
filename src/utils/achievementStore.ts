import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "./authCache";
import { ACHIEVEMENTS_LIBRARY, Achievement } from "@/data/achievements";
import { toast } from "sonner";

interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

export const achievementStore = {
  getUnlocked: async (): Promise<UnlockedAchievement[]> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return [];

    const { data, error } = await supabase
      .from("achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", user.id);

    if (error) {
      console.warn("[achievementStore] getUnlocked failed:", error);
      return [];
    }
    return (data ?? []).map((row: any) => ({ id: row.achievement_id, unlockedAt: row.unlocked_at }));
  },

  getAll: async (): Promise<(Achievement & { unlocked: boolean; unlockedAt?: string })[]> => {
    const unlocked = await achievementStore.getUnlocked();
    return ACHIEVEMENTS_LIBRARY.map(ach => {
      const found = unlocked.find(u => u.id === ach.id);
      return { ...ach, unlocked: !!found, unlockedAt: found?.unlockedAt };
    });
  },

  unlock: async (id: string): Promise<void> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return;

    const unlocked = await achievementStore.getUnlocked();
    if (unlocked.some(u => u.id === id)) return;

    const achievement = ACHIEVEMENTS_LIBRARY.find(a => a.id === id);
    if (!achievement) return;

    const now = new Date().toISOString();
    const { error } = await supabase.from("achievements").upsert(
      { user_id: user.id, achievement_id: id, unlocked_at: now },
      { onConflict: "user_id,achievement_id" }
    );
    if (error) console.warn("[achievementStore] unlock failed:", error);

    toast.success(`Achievement Unlocked: ${achievement.title}!`, {
      description: achievement.description,
      icon: achievement.icon,
      duration: 5000,
    });
    window.dispatchEvent(new Event("achievementsUpdated"));
  },

  reset: async (): Promise<void> => {
    const user = await getAuthUser();
    const supabase = createClient();
    if (!user) return;

    await supabase.from("achievements").delete().eq("user_id", user.id);
    window.dispatchEvent(new Event("achievementsUpdated"));
  },
};

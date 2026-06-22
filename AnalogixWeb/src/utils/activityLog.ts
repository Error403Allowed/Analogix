 
import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "./authCache";

export interface DayActivity {
  date: string; // "YYYY-MM-DD"
  count: number;
}

function today(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export const activityLog = {
  async record(): Promise<void> {
    const user = await getAuthUser();
    if (!user) return;
    const supabase = createClient();

    // Upsert: increment count for today, insert with count=1 if not exists
    const { error } = await supabase.rpc("increment_activity", {
      p_user_id: user.id,
      p_date: today(),
    });

    if (error) {
      // Fallback: manual upsert if RPC not available yet
      const { data: existing } = await supabase
        .from("activity_log")
        .select("id, count")
        .eq("user_id", user.id)
        .eq("date", today())
        .maybeSingle();

      if (existing) {
        await supabase
          .from("activity_log")
          .update({ count: existing.count + 1, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("activity_log")
          .insert({ user_id: user.id, date: today(), count: 1 });
      }
    }
  },

  async getLast7(): Promise<DayActivity[]> {
    const user = await getAuthUser();
    const supabase = createClient();

    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const [y, m, d_] = todayStr.split("-").map(Number);
    const todayDate = new Date(y, m - 1, d_);
    const todayDow = todayDate.getDay();
    const mondayOffset = (todayDow + 6) % 7;
    const monday = new Date(y, m - 1, d_ - mondayOffset);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
    }

    if (!user) return dates.map(date => ({ date, count: 0 }));

    const { data } = await supabase
      .from("activity_log")
      .select("date, count")
      .eq("user_id", user.id)
      .in("date", dates);

    const map = new Map((data ?? []).map((r: any) => [r.date, r.count]));
    return dates.map(date => ({ date, count: (map.get(date) as number) ?? 0 }));
  },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "./authCache";

export interface DayActivity {
  date: string; // "YYYY-MM-DD"
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
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
    const result: DayActivity[] = [];
    const supabase = createClient();
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    if (!user) return dates.map(date => ({ date, count: 0 }));

    const { data } = await supabase
      .from("activity_log")
      .select("date, count")
      .eq("user_id", user.id)
      .in("date", dates);

    const map = new Map((data ?? []).map((r: any) => [r.date, r.count]));
    for (const date of dates) {
      result.push({ date, count: map.get(date) ?? 0 });
    }
    return result;
  },
};

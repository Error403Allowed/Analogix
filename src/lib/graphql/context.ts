import { createClient } from "@/lib/supabase/server";

export interface ContextType {
  userId: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

export async function createContext(): Promise<ContextType> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { userId: user?.id ?? null, supabase };
}

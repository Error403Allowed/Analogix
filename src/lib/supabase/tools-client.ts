import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let cachedClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createToolsClient() {
  if (!cachedClient) {
    cachedClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }
  return cachedClient;
}
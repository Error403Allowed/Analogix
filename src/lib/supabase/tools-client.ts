import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "@supabase/supabase-js: Your project's URL and API key are required to create a Supabase client!\n" +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
  );
}

let cachedClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createToolsClient() {
  if (!cachedClient) {
    // Narrowed by throw above
    cachedClient = createSupabaseClient(
      supabaseUrl as string,
      supabaseAnonKey as string
    );
  }
  return cachedClient;
}
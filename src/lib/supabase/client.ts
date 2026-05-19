import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const browserSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const browserSupabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!browserSupabaseUrl || !browserSupabaseAnonKey) {
  throw new Error(
    "@supabase/ssr: Your project's URL and API key are required to create a Supabase client!\n" +
      "Check your Supabase project's API settings and make sure NEXT_PUBLIC_SUPABASE_URL " +
      "and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment."
  );
}

export const createClient = () =>
  createSupabaseClient(browserSupabaseUrl, browserSupabaseAnonKey);

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const serverSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serverSupabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

export const createClient = async (): Promise<any> => {
  const cookieStore = await cookies();

  if (!serverSupabaseUrl || !serverSupabaseAnonKey) {
    throw new Error(
      "@supabase/ssr: Your project's URL and API key are required to create a Supabase server client!\n" +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
    );
  }

  return createServerClient(serverSupabaseUrl, serverSupabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch (err) {
          console.error("[supabase/server] Failed to set cookies:", err);
        }
      },
    },
  });
};

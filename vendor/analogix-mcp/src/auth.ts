import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function createUserClient(args: Record<string, unknown>): SupabaseClient {
  const accessToken = args._accessToken as string | undefined;
  if (accessToken) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }
  throw new Error("Authentication required: _accessToken is missing");
}

export function requireUserId(args: Record<string, unknown>): string {
  const userId = args._userId as string | undefined;
  if (!userId || typeof userId !== "string") {
    throw new Error("Authentication required: _userId is missing");
  }
  return userId;
}

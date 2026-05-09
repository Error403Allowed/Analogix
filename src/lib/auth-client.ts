"use client";

import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogle(next = "/dashboard") {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("OAuth error:", error);
    throw error;
  }

  if (data.url) {
    window.location.href = data.url;
  }
}
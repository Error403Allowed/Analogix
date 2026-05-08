"use client";

import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogle(next = "/onboarding?step=2") {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
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
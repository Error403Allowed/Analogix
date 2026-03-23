import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding?step=2";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if user has already completed onboarding
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_complete, grade, subjects")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.onboarding_complete || profile?.grade || (Array.isArray(profile?.subjects) && profile.subjects.length > 0)) {
            return NextResponse.redirect(`${origin}/dashboard`);
          }
        }
      } catch {
        // Profile check failed — still let them through to onboarding
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/onboarding?error=auth_failed`);
}

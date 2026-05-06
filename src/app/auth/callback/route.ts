import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/onboarding?step=2";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_complete, name, grade, state, subjects, hobbies, hobby_ids, hobby_details")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.onboarding_complete || profile?.grade || profile?.name || (Array.isArray(profile?.subjects) && profile.subjects.length > 0)) {
            return NextResponse.redirect(`${origin}/dashboard`);
          }
        }
      } catch {
        // Profile check failed — still let them through to onboarding
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (errorParam) {
    console.error("OAuth error:", errorParam, errorDescription);
    return NextResponse.redirect(`${origin}/onboarding?error=auth_failed`);
  }

  return NextResponse.redirect(`${origin}/onboarding?error=auth_failed`);
}

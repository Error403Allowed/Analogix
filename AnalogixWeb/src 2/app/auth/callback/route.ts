import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (errorParam) {
    console.error("OAuth error:", errorParam, errorDescription);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Get user's name from Google metadata
        const meta = user.user_metadata || {};
        const firstName = meta.first_name || meta.given_name;
        const lastName = meta.last_name || meta.family_name;
        const fullName = meta.full_name || meta.name;
        const googleName = [firstName, lastName].filter(Boolean).join(" ").trim() || fullName || "";

        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete, name, grade, state, subjects, hobbies, hobby_ids, hobby_details")
          .eq("id", user.id)
          .maybeSingle();

        const hasProfileData = profile?.onboarding_complete
          || profile?.name
          || profile?.grade
          || profile?.state
          || (Array.isArray(profile?.subjects) && profile.subjects.length > 0)
          || (Array.isArray(profile?.hobbies) && profile.hobbies.length > 0)
          || (Array.isArray(profile?.hobby_ids) && profile.hobby_ids.length > 0)
          || (profile?.hobby_details && Object.keys(profile.hobby_details).length > 0);

        if (hasProfileData) {
          // Existing user - redirect to dashboard
          return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
        } else {
          // New user - go to onboarding with pre-filled name
          const onboardingUrl = googleName
            ? `${requestUrl.origin}/onboarding?step=2&name=${encodeURIComponent(googleName)}`
            : `${requestUrl.origin}/onboarding?step=2`;
          return NextResponse.redirect(onboardingUrl);
        }
      }
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    }

    console.error("Exchange error:", error);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
  }

  return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
}

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const getOrigin = (request: Request) => {
  // First, check the environment variable (most reliable for Vercel)
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl;

  // Prefer the actual callback request URL to avoid cross-host redirects.
  try {
    const urlOrigin = new URL(request.url).origin;
    if (urlOrigin) return urlOrigin;
  } catch {
    // Fall back to forwarded headers if URL parsing somehow fails.
  }

  const hdrs = request.headers;
  const forwardedProto = hdrs.get("x-forwarded-proto") ?? "https";
  const forwardedHost = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const host = forwardedHost?.split(",")[0]?.trim();
  if (host) return `${forwardedProto}://${host}`;

  // Last resort fallback
  return "https://localhost:3000";
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getOrigin(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding?step=2";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if this user has already completed onboarding in their profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, grade, state, subjects, hobbies, hobby_ids, hobby_details, onboarding_complete")
          .eq("id", user.id)
          .single();

        const hasProfile =
          profile?.onboarding_complete ||
          !!profile?.grade ||
          !!profile?.state ||
          (Array.isArray(profile?.subjects) && profile.subjects.length > 0) ||
          (Array.isArray(profile?.hobbies) && profile.hobbies.length > 0) ||
          (Array.isArray(profile?.hobby_ids) && profile.hobby_ids.length > 0) ||
          (profile?.hobby_details && Object.keys(profile.hobby_details).length > 0);

        if (hasProfile) {
          return NextResponse.redirect(`${origin}/dashboard`);
        }
      }
      // New user or onboarding not complete — send to onboarding step 2
      return NextResponse.redirect(`${origin}/onboarding?step=2`);
    }
  }

  return NextResponse.redirect(`${origin}/onboarding?error=auth_failed`);
}

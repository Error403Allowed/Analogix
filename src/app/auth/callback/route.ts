import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const getOrigin = (request: Request) => {
  const hdrs = headers();
  const forwardedProto = hdrs.get("x-forwarded-proto") ?? "http";
  const forwardedHost = hdrs.get("x-forwarded-host") ?? hdrs.get("host");

  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host) return `${forwardedProto}://${host}`;
  }

  return new URL(request.url).origin;
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
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/onboarding?error=auth_failed`);
}

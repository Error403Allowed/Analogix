import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AccountAuthProvider = "google" | "email" | "both" | null;

/**
 * Returns how an account with the given email was registered ("google",
 * "email", "both", or null when no account exists). Used after a failed
 * email/password sign-in so we can tell Google-only users to sign in with
 * Google instead of showing a generic "invalid credentials" message.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ provider: null }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await (supabase.rpc as any)("get_email_auth_provider", {
      p_email: email,
    });

    if (error) {
      console.error("[auth/account-provider] RPC failed:", error);
      return NextResponse.json({ provider: null }, { status: 500 });
    }

    const provider = (data ?? null) as AccountAuthProvider;
    return NextResponse.json(
      { provider },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[auth/account-provider] unexpected error:", err);
    return NextResponse.json({ provider: null }, { status: 500 });
  }
}

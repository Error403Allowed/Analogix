"use client";

import { createClient } from "@/lib/supabase/client";
import { resolveAuthDestination } from "@/lib/auth-routing";

/**
 * Build a /login redirect carrying the OAuth/PKCE failure details so the login
 * surface can show a message the user can act on.
 */
export function redirectWithError(
  origin: string,
  errorCode: string,
  description: string | null
): string {
  const params = new URLSearchParams({ error: "auth_failed", error_code: errorCode });
  if (description) params.set("error_description", description.slice(0, 500));
  return `${origin}/login?${params.toString()}`;
}

/**
 * Finish an OAuth / email confirmation round trip for a `code` that landed on
 * the current page. Shared by the dedicated /auth/callback route and the global
 * OAuthCodeCatcher fallback (when Supabase can't honour the requested redirect
 * target it falls back to its Site URL, so the code can arrive on the site
 * root instead).
 *
 * Returns the next route to navigate to:
 *  - "/dashboard" or "/onboarding?step=1" once the session is established,
 *  - a `/login?error=...` URL if the exchange or user lookup failed.
 *
 * The PKCE code verifier is stored on the origin where sign-in started, so
 * this can only succeed when the code and the verifier share an origin - which
 * is guaranteed when sign-in and the redirect both happen on the current
 * origin (see getAuthRedirectOrigin in src/lib/auth-client.ts).
 */
export async function completeAuthCodeExchange(code: string): Promise<string> {
  const origin = window.location.origin;
  const supabase = createClient();

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback: exchangeCodeForSession failed", {
        message: error.message,
        code: (error as { code?: string }).code,
        status: (error as { status?: number }).status,
        name: error.name,
      });
      const supabaseCode = (error as { code?: string }).code ?? "exchange_failed";
      return redirectWithError(origin, supabaseCode, error.message);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return `${origin}/login`;
    }

    const meta = user.user_metadata || {};
    const profileData: Record<string, unknown> = {
      id: user.id,
      updated_at: new Date().toISOString(),
    };
    if (meta.name || meta.full_name) profileData.name = meta.name || meta.full_name;
    if (meta.avatar_url || meta.picture) profileData.avatar_url = meta.avatar_url || meta.picture;

    if (profileData.name !== undefined || profileData.avatar_url !== undefined) {
      try {
        await supabase.from("profiles").upsert(profileData, { onConflict: "id" }).maybeSingle();
      } catch (upsertErr) {
        // A profile write must never block an otherwise-successful sign-in.
        console.warn("Auth callback: profile upsert failed", upsertErr);
      }
    }

    // Strip the transient auth params so a refresh doesn't re-run the exchange.
    try {
      const url = new URL(window.location.href);
      const hadAuthParams = url.searchParams.has("code") || url.searchParams.has("state");
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      if (hadAuthParams) window.history.replaceState({}, "", url.toString());
    } catch {
      /* best effort */
    }

    const destination = await resolveAuthDestination(user.id);
    return destination === "app" ? "/dashboard" : "/onboarding?step=1";
  } catch (err) {
    console.error("Auth callback: unexpected error", err);
    return redirectWithError(origin, "unexpected", (err as Error)?.message ?? null);
  }
}

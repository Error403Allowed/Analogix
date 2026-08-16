"use client";

import { createClient } from "@/lib/supabase/client";

export type AccountAuthProvider = "google" | "email" | "both" | null;

/**
 * Look up how an account with the given email was registered. Returns "google"
 * for Google-only accounts (which have no password and can never sign in with
 * email/password), "email" for password accounts, "both" when linked, or null
 * when no account exists or the lookup fails.
 */
export async function getAccountAuthProvider(email: string): Promise<AccountAuthProvider> {
  try {
    const res = await fetch(
      `/api/auth/account-provider?email=${encodeURIComponent(email)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { provider?: AccountAuthProvider };
    return data.provider ?? null;
  } catch {
    return null;
  }
}

function isInvalidCredentials(error: { code?: string; message?: string }): boolean {
  const c = (error.code || "").toLowerCase();
  const m = (error.message || "").toLowerCase();
  return (
    c === "invalid_credentials" ||
    c === "wrong_password" ||
    m.includes("invalid login credentials")
  );
}

/**
 * Canonical origin used for OAuth / email redirect targets. Falls back to the
 * current tab's origin so dev (localhost) and any live alias keep working,
 * but in production it pins auth callbacks to the real site (NEXT_PUBLIC_SITE_URL)
 * so a visit from a Vercel deployment alias never strands the user on a
 * throwaway domain like analogix-analogix.vercel.app.
 */
function getAuthRedirectOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && !/^http:\/\/localhost(?::\d+)?$/.test(configured)) {
    return configured.replace(/\/$/, "");
  }
  return window.location.origin;
}

export async function signInWithGoogle(next = "/dashboard") {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getAuthRedirectOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
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

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // A Google-only account has no password, so this always fails with
    // "invalid login credentials". Tell the user to use Google instead.
    if (isInvalidCredentials(error)) {
      const provider = await getAccountAuthProvider(email);
      if (provider === "google") {
        const hint = new Error(
          "This email uses Google sign-in. Please sign in with Google to continue."
        );
        (hint as Error & { code?: string }).code = "google_account_required";
        throw hint;
      }
    }
    throw error;
  }
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAuthRedirectOrigin()}/auth/callback?next=/dashboard`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function resetPasswordForEmail(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAuthRedirectOrigin()}/auth/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export type PasswordCheck = {
  label: string;
  key: string;
  pass: boolean;
};

export function validatePassword(pw: string): { checks: PasswordCheck[]; allPass: boolean } {
  const checks: PasswordCheck[] = [
    { label: "At least 8 characters", key: "minLength", pass: pw.length >= 8 },
    { label: "One lowercase letter", key: "lowercase", pass: /[a-z]/.test(pw) },
    { label: "One uppercase letter", key: "uppercase", pass: /[A-Z]/.test(pw) },
    { label: "One number", key: "digit", pass: /\d/.test(pw) },
    { label: "One symbol", key: "symbol", pass: /[^a-zA-Z0-9]/.test(pw) },
  ];
  return { checks, allPass: checks.every(c => c.pass) };
}

export function getEmailError(code: string | null, message: string | null): string {
  const c = (code || "").toLowerCase();
  const m = (message || "").toLowerCase();

  if (c === "google_account_required") {
    return "This email uses Google sign-in. Please sign in with Google to continue.";
  }
  if (c === "invalid_credentials" || c === "wrong_password" || m.includes("invalid login credentials")) {
    return "Invalid email or password. If you signed up with Google, use Continue with Google instead.";
  }
  if (c === "email_not_confirmed" || m.includes("email not confirmed")) {
    return "Please confirm your email address first - check your inbox for a confirmation link.";
  }
  if (c === "user_not_found" || m.includes("user not found")) {
    return "No account found with this email.";
  }
  if (c === "weak_password" || m.includes("weak password") || m.includes("password should be at least 6") || m.includes("password should be at least 8")) {
    return "Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.";
  }
  if (c === "email_exists" || m.includes("already registered") || m.includes("user already registered")) {
    return "An account with this email already exists. Try signing in.";
  }
  if (c === "rate_limit" || m.includes("rate limit") || m.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m) return message!;
  return "Something went wrong. Please try again.";
}

/**
 * Map a Supabase auth / OAuth error code + description from the callback URL
 * into a message a user can actually act on. Used on the login surface after
 * an OAuth or PKCE round trip fails.
 */
export function describeAuthError(code: string | null, raw: string | null): string {
  const c = (code || "").toLowerCase();
  const r = (raw || "").toLowerCase();

  if (
    r.includes("unable to exchange external code") ||
    r.includes("4/0a") ||
    r.includes("unexpected_failure") ||
    c === "unexpected_failure"
  ) {
    return "Google sign-in couldn't be completed. Please try again - if you registered with Google, keep using Continue with Google.";
  }
  if (c.includes("redirect_uri_mismatch") || r.includes("redirect_uri_mismatch")) {
    return "The Google sign-in redirect isn't configured for this site address yet. Please try again in a moment or use email & password.";
  }
  if (c.includes("access_denied") || r.includes("access_denied")) {
    return "Google sign-in was cancelled. Tap Continue with Google to try again.";
  }
  if (c.includes("exchange_failed") || c === "missing_code") {
    return "We couldn't finish signing you in. The auth code was missing or expired - please try again.";
  }
  return getEmailError(c || null, raw);
}

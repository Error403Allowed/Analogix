"use client";

import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogle(next = "/dashboard") {
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

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
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
    redirectTo: `${window.location.origin}/auth/reset-password`,
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

  if (c === "invalid_credentials" || c === "wrong_password" || m.includes("invalid login credentials")) {
    return "Invalid email or password. Maybe you signed in using Google.";
  }
  if (c === "email_not_confirmed" || m.includes("email not confirmed")) {
    return "Please confirm your email address first — check your inbox for a confirmation link.";
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

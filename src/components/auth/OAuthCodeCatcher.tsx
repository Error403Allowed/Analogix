"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { completeAuthCodeExchange, redirectWithError } from "@/lib/auth-callback";

// Routes that process the auth code themselves.
const HANDLED_PATH_PREFIXES = ["/auth/callback", "/auth/reset-password"];

/**
 * Safety net for OAuth / email redirects that Supabase can't route to the
 * dedicated /auth/callback page.
 *
 * When the project's allowed redirect URLs don't include the current origin's
 * callback, Supabase falls back to its configured Site URL and the auth code
 * arrives at some other page - commonly the landing root, e.g.
 * `https://<origin>/?code=...`. This catcher detects that code anywhere in the
 * app, completes the PKCE exchange (the verifier cookie lives on this origin
 * because sign-in started here) and routes the user on.
 */
export default function OAuthCodeCatcher() {
  const router = useRouter();
  const processedKey = useRef<string | null>(null);

  useEffect(() => {
    const pathname = window.location.pathname;
    if (HANDLED_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const origin = window.location.origin;

    const key = `${pathname}${window.location.search}${hash}`;
    if (processedKey.current === key) return;

    // Check URL hash for error params (Supabase PKCE errors arrive in hash)
    if (hash) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const hashError = hashParams.get("error");
      const hashErrorCode = hashParams.get("error_code");
      const hashErrorDesc = hashParams.get("error_description");
      if (hashError || hashErrorCode) {
        processedKey.current = key;
        console.error("Auth catcher: hash error", { hashError, hashErrorCode, hashErrorDesc });
        window.location.hash = "";
        router.replace(redirectWithError(origin, hashErrorCode ?? hashError ?? "unknown", hashErrorDesc));
        return;
      }
    }

    const errorParam = params.get("error");
    // `auth_failed` is the app's own signal (see redirectWithError) and is
    // surfaced by the login page itself - re-forwarding it here would clobber
    // the real error_code/error_description and log a spurious error.
    if (errorParam && errorParam !== "auth_failed") {
      processedKey.current = key;
      console.error("Auth catcher: OAuth error", errorParam, params.get("error_description"));
      router.replace(redirectWithError(origin, errorParam, params.get("error_description")));
      return;
    }

    const code = params.get("code");
    if (!code) return;

    processedKey.current = key;
    void completeAuthCodeExchange(code).then((target) => router.replace(target));
  }, [router]);

  return null;
}

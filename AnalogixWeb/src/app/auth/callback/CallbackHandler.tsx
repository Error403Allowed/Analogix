"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

const redirectWithError = (origin: string, errorCode: string, description: string | null) => {
  const params = new URLSearchParams({ error: "auth_failed", error_code: errorCode });
  if (description) params.set("error_description", description.slice(0, 500));
  return `${origin}/onboarding?${params.toString()}`;
};

export default function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const origin = window.location.origin;
    const hash = window.location.hash;

    // Check URL hash for error params (Supabase PKCE errors arrive in hash)
    if (hash) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const hashError = hashParams.get("error");
      const hashErrorCode = hashParams.get("error_code");
      const hashErrorDesc = hashParams.get("error_description");
      if (hashError || hashErrorCode) {
        console.error("Auth callback: hash error", { hashError, hashErrorCode, hashErrorDesc });
        window.location.hash = "";
        router.replace(redirectWithError(origin, hashErrorCode ?? hashError ?? "unknown", hashErrorDesc));
        return;
      }
    }

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const nextRaw = searchParams.get("next");
    const next = nextRaw ? decodeURIComponent(nextRaw) : "/dashboard";

    if (errorParam) {
      console.error("OAuth error:", errorParam, errorDescription);
      router.replace(redirectWithError(origin, errorParam, errorDescription));
      return;
    }

    if (!code) {
      console.error("Auth callback: no code in URL");
      router.replace(redirectWithError(origin, "missing_code", null));
      return;
    }

    const supabase = createClient();

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error("Auth callback: exchangeCodeForSession failed", {
          message: error.message,
          code: (error as { code?: string }).code,
          status: (error as { status?: number }).status,
          name: error.name,
        });
        const supabaseCode = (error as { code?: string }).code ?? "exchange_failed";
        router.replace(redirectWithError(origin, supabaseCode, error.message));
        return;
      }

      return supabase.auth.getUser();
    }).then((result) => {
      if (!result) return;
      const { data: { user }, error: userError } = result;
      if (userError || !user) {
        router.replace(`${origin}${next}`);
        return;
      }

      const meta = user.user_metadata || {};
      const firstName = meta.first_name || meta.given_name;
      const lastName = meta.last_name || meta.family_name;
      const fullName = meta.full_name || meta.name;
      const googleName = [firstName, lastName].filter(Boolean).join(" ").trim() || fullName || "";

      supabase
        .from("profiles")
        .select("onboarding_complete, name, grade, state, subjects, hobbies, hobby_ids, hobby_details")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          const hasProfileData = profile?.onboarding_complete
            || profile?.name
            || profile?.grade
            || profile?.state
            || (Array.isArray(profile?.subjects) && profile.subjects.length > 0)
            || (Array.isArray(profile?.hobbies) && profile.hobbies.length > 0)
            || (Array.isArray(profile?.hobby_ids) && profile.hobby_ids.length > 0)
            || (profile?.hobby_details && Object.keys(profile.hobby_details).length > 0);

          if (hasProfileData) {
            router.replace(`${origin}${next}`);
          } else {
            const onboardingUrl = googleName
              ? `${origin}/onboarding?step=2&name=${encodeURIComponent(googleName)}`
              : `${origin}/onboarding?step=2`;
            router.replace(onboardingUrl);
          }
        });
    }).catch((err) => {
      console.error("Auth callback: unexpected error", err);
      router.replace(redirectWithError(origin, "unexpected", err?.message ?? null));
    });
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

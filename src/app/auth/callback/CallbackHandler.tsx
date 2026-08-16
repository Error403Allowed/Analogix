"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveAuthDestination } from "@/lib/auth-routing";
import { Loader2 } from "lucide-react";

const redirectWithError = (origin: string, errorCode: string, description: string | null) => {
  const params = new URLSearchParams({ error: "auth_failed", error_code: errorCode });
  if (description) params.set("error_description", description.slice(0, 500));
  return `${origin}/login?${params.toString()}`;
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

    supabase.auth.exchangeCodeForSession(code).then(({ error }: { error: any }) => {
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
    }).then(async (result: any) => {
      if (!result) return;
      const { data: { user }, error: userError } = result;
      if (userError || !user) {
        router.replace(`${origin}/login`);
        return;
      }

      const meta = user.user_metadata || {};
      const profileData: Record<string, unknown> = {
        id: user.id,
        updated_at: new Date().toISOString(),
      };
      if (meta.name || meta.full_name) {
        profileData.name = meta.name || meta.full_name;
      }
      if (meta.avatar_url || meta.picture) {
        profileData.avatar_url = meta.avatar_url || meta.picture;
      }
      if (Object.keys(profileData).length > 1) {
        await supabase.from("profiles").upsert(profileData, { onConflict: "id" }).maybeSingle();
      }

      // New accounts go through onboarding; returning accounts go straight into
      // the app. Same decision as /login and ProtectedRoute.
      const destination = await resolveAuthDestination(user.id);
      router.replace(destination === "app" ? "/dashboard" : "/onboarding?step=1");
    }).catch((err: any) => {
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
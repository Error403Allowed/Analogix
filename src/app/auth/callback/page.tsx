"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";

  useEffect(() => {
    const exchangeCode = async () => {
      if (code) {
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!error) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Get user's name from Google metadata for pre-filling onboarding
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
              // Existing user - sync profile data to localStorage with onboarding complete flag
              try {
                const existing = JSON.parse(localStorage.getItem("userPreferences") || "{}");
                const syncedPrefs = {
                  ...existing,
                  name: profile?.name ?? existing.name ?? "Student",
                  grade: profile?.grade ?? existing.grade ?? null,
                  state: profile?.state ?? existing.state ?? null,
                  subjects: Array.isArray(profile?.subjects) ? profile.subjects : (existing.subjects ?? []),
                  hobbies: Array.isArray(profile?.hobbies) ? profile.hobbies : (existing.hobbies ?? []),
                  hobbyIds: Array.isArray(profile?.hobby_ids) ? profile.hobby_ids : (existing.hobbyIds ?? []),
                  hobbyDetails: profile?.hobby_details && typeof profile.hobby_details === "object"
                    ? profile.hobby_details
                    : (existing.hobbyDetails ?? {}),
                  onboardingComplete: true,
                  userId: user.id,
                };
                localStorage.setItem("userPreferences", JSON.stringify(syncedPrefs));
                window.dispatchEvent(new Event("userPreferencesUpdated"));
              } catch { /* ignore storage errors */ }
              router.replace("/dashboard");
              return;
            } else {
              // New user - go to onboarding with pre-filled name from Google
              const onboardingUrl = googleName 
                ? `/onboarding?step=2&name=${encodeURIComponent(googleName)}`
                : "/onboarding?step=2";
              router.replace(onboardingUrl);
              return;
            }
          }
          router.replace(next);
          return;
        }
        console.error("Exchange error:", error);
      }

      if (errorParam) {
        console.error("OAuth error:", errorParam, errorDescription);
      }
      
      router.replace(`/login?error=auth_failed`);
    };

    exchangeCode();
  }, [code, errorParam, errorDescription, next, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";
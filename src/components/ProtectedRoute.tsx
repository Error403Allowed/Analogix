"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

const hasProfileData = (profile: any) => {
  if (!profile) return false;
  if (profile.onboarding_complete) return true;
  if (profile.grade || profile.state) return true;
  if (Array.isArray(profile.subjects) && profile.subjects.length > 0) return true;
  if (Array.isArray(profile.hobbies) && profile.hobbies.length > 0) return true;
  if (Array.isArray(profile.hobby_ids) && profile.hobby_ids.length > 0) return true;
  if (profile.hobby_details && typeof profile.hobby_details === "object" && Object.keys(profile.hobby_details).length > 0) return true;
  return false;
};

const syncPrefsFromProfile = (profile: any, userId: string) => {
  try {
    const existing = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    const next = {
      ...existing,
      name: profile?.name ?? existing.name,
      grade: profile?.grade ?? existing.grade ?? null,
      state: profile?.state ?? existing.state ?? null,
      subjects: Array.isArray(profile?.subjects) ? profile.subjects : (existing.subjects ?? []),
      hobbies: Array.isArray(profile?.hobbies) ? profile.hobbies : (existing.hobbies ?? []),
      hobbyIds: Array.isArray(profile?.hobby_ids) ? profile.hobby_ids : (existing.hobbyIds ?? []),
      hobbyDetails: profile?.hobby_details && typeof profile.hobby_details === "object"
        ? profile.hobby_details
        : (existing.hobbyDetails ?? {}),
      onboardingComplete: true,
      userId,
    };
    localStorage.setItem("userPreferences", JSON.stringify(next));
    window.dispatchEvent(new Event("userPreferencesUpdated"));
  } catch {}
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Not signed in — send to landing page (auth is user-initiated there)
      router.replace("/");
      return;
    }

    // Signed in — check if onboarding is complete.
    // Check localStorage first (fast), then Supabase as source of truth.
    const checkOnboarding = async () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        if (prefs?.onboardingComplete && (!prefs.userId || prefs.userId === user.id)) {
          setChecking(false);
          return;
        }
      } catch {}

      // localStorage incomplete or missing — check Supabase profile
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("id", user.id)
          .single();

        if (hasProfileData(profile)) {
          syncPrefsFromProfile(profile, user.id);
          if (!profile?.onboarding_complete) {
            await supabase
              .from("profiles")
              .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
              .eq("id", user.id);
          }
          setChecking(false);
          return;
        }
      } catch {}

      // Onboarding genuinely not complete
      router.replace("/onboarding?step=2");
    };

    checkOnboarding();
  }, [user, loading, router]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
};

export default ProtectedRoute;

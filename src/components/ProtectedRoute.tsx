"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Not signed in at all — go to onboarding to sign in
      router.replace("/onboarding");
      return;
    }

    // Signed in — check if onboarding is complete.
    // Check localStorage first (fast), then Supabase as source of truth.
    const checkOnboarding = async () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        if (prefs?.onboardingComplete) {
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

        if (profile?.onboarding_complete) {
          // Sync back to localStorage so next check is instant
          try {
            const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
            localStorage.setItem("userPreferences", JSON.stringify({ ...prefs, onboardingComplete: true }));
          } catch {}
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

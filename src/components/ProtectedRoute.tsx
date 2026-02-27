"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// ── Dev bypass ────────────────────────────────────────────────────────────────
// In development we skip the Supabase auth gate entirely so you can work
// without needing Google OAuth configured. Onboarding prefs still apply —
// if you haven't completed onboarding you'll be sent there first.
// This block is completely tree-shaken in production builds.
const IS_DEV = process.env.NODE_ENV === "development";

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Dev bypass: skip auth check, just ensure onboarding is done
    if (IS_DEV) {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        if (!prefs?.onboardingComplete) {
          router.replace("/onboarding");
        }
      } catch {
        // localStorage broken — let them through anyway
      }
      return;
    }

    if (loading) return;

    if (!user) {
      router.replace("/onboarding");
      return;
    }

    try {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      if (!prefs?.onboardingComplete) {
        router.replace("/onboarding?step=2");
      }
    } catch {
      // If localStorage is broken, just let them through
    }
  }, [user, loading, router]);

  // Dev bypass: render immediately (skip the loading spinner)
  if (IS_DEV) {
    try {
      const prefs = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
        : {};
      if (!prefs?.onboardingComplete) return null; // wait for redirect
    } catch {
      // fall through
    }
    return <>{children}</>;
  }

  if (loading) {
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

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Not signed in at all — go to onboarding step 1
      router.replace("/onboarding");
      return;
    }

    // Signed in but hasn't finished onboarding — skip the auth step
    try {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      if (!prefs?.onboardingComplete) {
        router.replace("/onboarding?step=2");
      }
    } catch {
      // If localStorage is broken, just let them through
    }
  }, [user, loading, router]);

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

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from "react";
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
      userId,
    };
    localStorage.setItem("userPreferences", JSON.stringify(next));
    window.dispatchEvent(new Event("userPreferencesUpdated"));
  } catch { /* ignore storage errors */ }
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const userRef = useRef<string | null>(null);
  const dbCheckDoneRef = useRef(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) {
      return;
    }

    // No user - redirect to login
    if (!user) {
      setIsChecking(false);
      router.replace("/login");
      return;
    }

    // User is authenticated - allow access (onboarding check removed)
    const checkAuth = async () => {
      // Only check if user changed (prevent redundant checks)
      if (userRef.current === user.id) {
        setIsChecking(false);
        return;
      }

      userRef.current = user.id;
      setIsChecking(false);
    };

    checkAuth();
  }, [user, loading, router]);

  // Deferred DB sync — runs after page is visible
  const syncPrefsFromProfileDeferred = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete, name, grade, state, subjects, hobbies, hobby_ids, hobby_details")
        .eq("id", userId)
        .maybeSingle();

      if (hasProfileData(profile)) {
        syncPrefsFromProfile(profile, userId);
      }
    } catch {
      // Silently fail — localStorage is our source of truth for now
    }
  };

  // Always render children to ensure proper hydration and tab caching
  // Use overlay for loading/redirect states instead of replacing content
  const isRedirecting = (!user && !loading) || (user && isChecking);
  
  if (isRedirecting) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        {children}
      </>
    );
  }

  // Loading auth - show overlay but render children
  if (loading) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

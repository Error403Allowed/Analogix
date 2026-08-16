"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { resolveAuthDestination } from "@/lib/auth-routing";
import { syncPrefsFromProfile, type ProfileRecord } from "@/lib/profile-sync";
import { Loader2 } from "lucide-react";

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

    const checkAuth = async () => {
      // Only re-resolve when the user changes
      if (userRef.current === user.id) {
        setIsChecking(false);
        return;
      }
      userRef.current = user.id;

      const destination = await resolveAuthDestination(user.id);
      if (destination === "onboarding") {
        // Brand-new account - finish setup before entering the app
        router.replace("/onboarding?step=1");
        return;
      }

      // Returning user - hydrate the local cache from the DB (best effort)
      if (!dbCheckDoneRef.current) {
        dbCheckDoneRef.current = true;
        syncPrefsFromProfileDeferred(user.id);
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [user, loading, router]);

  // Deferred DB sync - runs after page is visible
  const syncPrefsFromProfileDeferred = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete, tours_completed, name, grade, state, subjects, hobbies, hobby_ids, hobby_details, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        syncPrefsFromProfile(profile as ProfileRecord, userId);
      }
    } catch {
      // Silently fail - localStorage cache is already in place
    }
  };

  const isRedirecting = (!user && !loading) || (user && isChecking);

  if (isRedirecting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Loading auth - show overlay but render children for hydration
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
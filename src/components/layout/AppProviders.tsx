"use client";

import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ThemeSync from "@/components/theme/ThemeSync";
import { ReleasePointerCaptureGuard } from "@/components/layout/ReleasePointerCaptureGuard";
import { AuthProvider } from "@/context/AuthContext";
import { TourProvider } from "@/context/TourContext";
import PageTour from "@/components/onboarding/PageTour";
import { TourAutoTrigger } from "@/components/onboarding/TourAutoTrigger";
import OAuthCodeCatcher from "@/components/auth/OAuthCodeCatcher";
import { getAuthUser } from "@/utils/authCache";
import { createClient } from "@/lib/supabase/client";

async function persistTourCompleted(tourId: string) {
  try {
    const user = await getAuthUser();
    if (!user) return;
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("tours_completed")
      .eq("id", user.id)
      .maybeSingle();
    const current = Array.isArray(profile?.tours_completed) ? profile.tours_completed : [];
    if (current.includes(tourId)) return;
    const { error } = await supabase
      .from("profiles")
      .update({ tours_completed: [...current, tourId], updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) console.warn("[TourSyncProvider] failed to persist tour:", error);
  } catch {
    // Tour persistence is best-effort; localStorage is the source of truth.
  }
}

function TourSyncProvider({ children }: { children: React.ReactNode }) {
  const handleTourCompleted = useCallback((tourId: string) => {
    void persistTourCompleted(tourId);
  }, []);

  return (
    <TourProvider onTourCompleted={handleTourCompleted}>
      {children}
    </TourProvider>
  );
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    fetch("/api/health").catch(() => {});
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <TourSyncProvider>
              <ThemeSync />
              <ReleasePointerCaptureGuard />
              <TourAutoTrigger />
              <OAuthCodeCatcher />
              <PageTour />
              {children}
              <Sonner />
            </TourSyncProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

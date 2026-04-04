"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import FirstVisitOverlay from "@/components/FirstVisitOverlay";
import ThemeSync from "@/components/ThemeSync";
import { AuthProvider } from "@/context/AuthContext";
import { TourProvider } from "@/context/TourContext";
import PageTour from "@/components/PageTour";
import { TourAutoTrigger } from "@/components/TourAutoTrigger";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Non-blocking health check (fire-and-forget, dev only)
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // Don't await — just fire it in the background
    fetch("/api/health").catch(() => {});
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <TourProvider>
              <ThemeSync />
              <FirstVisitOverlay />
              <TourAutoTrigger />
              <PageTour />
              {children}
              <Toaster />
              <Sonner />
            </TourProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

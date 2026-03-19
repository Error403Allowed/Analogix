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

  // Log environment health on startup (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      fetch("/api/health")
        .then((res) => res.json())
        .then((data) => console.log("[Health check]", data))
        .catch((err) => console.error("[Health check] failed", err));
    }
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

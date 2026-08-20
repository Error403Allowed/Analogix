"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ThemeSync from "@/components/theme/ThemeSync";
import { ReleasePointerCaptureGuard } from "@/components/layout/ReleasePointerCaptureGuard";
import { AuthProvider } from "@/context/AuthContext";
import OAuthCodeCatcher from "@/components/auth/OAuthCodeCatcher";

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
            <ThemeSync />
            <ReleasePointerCaptureGuard />
            <OAuthCodeCatcher />
            {children}
            <Sonner />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

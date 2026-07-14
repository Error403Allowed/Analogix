"use client";

import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider, useMutation } from "@apollo/client/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ThemeSync from "@/components/ThemeSync";
import { AuthProvider } from "@/context/AuthContext";
import { TourProvider } from "@/context/TourContext";
import PageTour from "@/components/PageTour";
import { TourAutoTrigger } from "@/components/TourAutoTrigger";
import { createApolloClient } from "@/graphql/client";
import { MARK_TOURS_COMPLETED } from "@/graphql/queries/user";

function TourSyncProvider({ children }: { children: React.ReactNode }) {
  const [markTours] = useMutation(MARK_TOURS_COMPLETED);
  const handleTourCompleted = useCallback((tourId: string) => {
    markTours({ variables: { tourIds: [tourId] } }).catch(() => {});
  }, [markTours]);

  return (
    <TourProvider onTourCompleted={handleTourCompleted}>
      {children}
    </TourProvider>
  );
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [apolloClient] = useState(() => createApolloClient());

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    fetch("/api/health").catch(() => {});
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <ApolloProvider client={apolloClient}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <TourSyncProvider>
                <ThemeSync />
                <TourAutoTrigger />
                <PageTour />
                {children}
                <Toaster />
                <Sonner />
              </TourSyncProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </ApolloProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

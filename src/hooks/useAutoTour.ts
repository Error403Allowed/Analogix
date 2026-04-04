"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTour } from "@/context/TourContext";
import { getTourForPath } from "@/types/tour";

/**
 * AutoTour Hook
 * Automatically shows page-specific tours when user visits a page for the first time.
 * Waits for the target elements to be in the DOM before starting.
 */
export const useAutoTour = () => {
  const pathname = usePathname();
  const { startTour, hasSeen, activeTour } = useTour();
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // Skip tours on these paths
    const skipPaths = [
      "/login", "/onboarding", "/auth/callback", "/study-guide-loading",
    ];
    if (skipPaths.some(path => pathname === path || pathname.startsWith(path + "/"))) {
      hasTriggeredRef.current = false;
      return;
    }

    // Don't re-trigger if a tour is already active
    if (activeTour) return;

    // Only trigger once per page navigation
    if (hasTriggeredRef.current) return;

    const tour = getTourForPath(pathname);
    if (!tour || !tour.autoShow || hasSeen(tour.storageKey)) return;

    // Wait for DOM to settle and elements to be rendered
    const timer = setTimeout(() => {
      // Verify target elements exist before starting
      const hasTargets = tour.steps.some(
        step => step.targetSelector && document.querySelector(step.targetSelector)
      );

      // If no targets found yet, wait a bit longer (page might still be loading)
      if (!hasTargets && tour.steps.some(s => s.targetSelector)) {
        const retryTimer = setTimeout(() => {
          hasTriggeredRef.current = true;
          startTour(tour);
        }, 1000);
        return () => clearTimeout(retryTimer);
      }

      hasTriggeredRef.current = true;
      startTour(tour);
    }, 1200);

    return () => {
      clearTimeout(timer);
      hasTriggeredRef.current = false;
    };
  }, [pathname, startTour, hasSeen, activeTour]);
};

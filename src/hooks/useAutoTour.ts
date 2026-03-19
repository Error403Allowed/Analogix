"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTour } from "@/context/TourContext";
import { getTourForPath, hasSeenTour } from "@/types/tour";

/**
 * AutoTour Hook
 * Automatically shows page-specific tours when user visits a page for the first time
 */
export const useAutoTour = () => {
  const pathname = usePathname();
  const { startTour, hasSeen } = useTour();

  useEffect(() => {
    // Skip tour on certain paths
    const skipPaths = [
      "/login",
      "/onboarding",
      "/auth/callback",
      "/study-guide-loading",
    ];

    if (skipPaths.some(path => pathname === path || pathname.startsWith(path + "/"))) {
      return;
    }

    // Check if there's a tour for this page
    const tour = getTourForPath(pathname);
    
    if (tour && tour.autoShow && !hasSeen(tour.storageKey)) {
      // Small delay to let the page fully render
      const timer = setTimeout(() => {
        startTour(tour);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [pathname, startTour, hasSeen]);
};

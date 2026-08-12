"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTour } from "@/context/TourContext";
import { getTourForPath } from "@/types/tour";

/**
 * AutoTour Hook
 * Automatically shows a page tour the first time a user visits a page,
 * but only after they've completed onboarding.
 */
export const useAutoTour = () => {
  const pathname = usePathname();
  const { startTour, hasSeen } = useTour();
  const triggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const tour = getTourForPath(pathname);
    if (!tour || !tour.autoShow) return;

    if (triggeredRef.current.has(tour.id)) return;

    // Only trigger after onboarding is complete and tour not seen server-side
    try {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      if (!prefs?.onboardingComplete) return;
      // Skip if already synced to server (persists across devices/browser clears)
      const serverTours: string[] = prefs?.toursCompleted ?? [];
      if (serverTours.includes(tour.id)) return;
    } catch {
      return;
    }

    if (!hasSeen(tour.storageKey)) {
      triggeredRef.current.add(tour.id);
      startTour(tour);
    }
  }, [pathname, startTour, hasSeen]);
};

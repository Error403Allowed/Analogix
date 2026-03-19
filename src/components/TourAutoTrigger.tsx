"use client";

import { useAutoTour } from "@/hooks/useAutoTour";

/**
 * TourAutoTrigger Component
 * This component exists solely to use the useAutoTour hook at the app level.
 * It doesn't render anything visible.
 */
export const TourAutoTrigger: React.FC = () => {
  useAutoTour();
  return null;
};

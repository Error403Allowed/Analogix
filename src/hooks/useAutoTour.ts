"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTour } from "@/context/TourContext";
import { getTourForPath } from "@/types/tour";

/**
 * AutoTour Hook - DISABLED
 * Tours are no longer shown automatically to users.
 * Keeping the hook in case we want to re-enable in the future.
 */
export const useAutoTour = () => {
  // Tours are disabled - do nothing
  return;
};

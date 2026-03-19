"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { TourConfig, TourStep } from "@/types/tour";
import { hasSeenTour, markTourAsSeen } from "@/types/tour";

interface TourContextType {
  /** Current active tour, if any */
  activeTour: TourConfig | null;
  /** Current step index in the active tour */
  currentStep: number;
  /** Start a specific tour */
  startTour: (tour: TourConfig) => void;
  /** Go to next step or end tour if on last step */
  nextStep: () => void;
  /** Go to previous step */
  prevStep: () => void;
  /** End the current tour early */
  endTour: () => void;
  /** Check if a specific tour has been seen */
  hasSeen: (storageKey: string) => boolean;
  /** Mark a tour as seen */
  markSeen: (storageKey: string) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
};

interface TourProviderProps {
  children: ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = useCallback((tour: TourConfig) => {
    setActiveTour(tour);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    
    if (currentStep < activeTour.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // End of tour - mark as seen and close
      markTourAsSeen(activeTour.storageKey);
      setActiveTour(null);
      setCurrentStep(0);
    }
  }, [activeTour, currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const endTour = useCallback(() => {
    if (activeTour) {
      // Mark as seen even if user exits early
      markTourAsSeen(activeTour.storageKey);
    }
    setActiveTour(null);
    setCurrentStep(0);
  }, [activeTour]);

  const hasSeen = useCallback((storageKey: string) => {
    return hasSeenTour(storageKey);
  }, []);

  const markSeen = useCallback((storageKey: string) => {
    markTourAsSeen(storageKey);
  }, []);

  return (
    <TourContext.Provider value={{ activeTour, currentStep, startTour, nextStep, prevStep, endTour, hasSeen, markSeen }}>
      {children}
    </TourContext.Provider>
  );
};

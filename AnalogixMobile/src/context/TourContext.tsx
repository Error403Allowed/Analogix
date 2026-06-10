import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TourConfig } from "../types/tour";
import { hasSeenTour as checkTourSeen } from "../types/tour";

interface TourContextType {
  activeTour: TourConfig | null;
  currentStep: number;
  startTour: (tour: TourConfig) => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  hasSeen: (storageKey: string) => Promise<boolean>;
  markSeen: (storageKey: string) => Promise<void>;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
};

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const seenCache = useRef<Set<string>>(new Set());

  const hasSeen = useCallback(async (storageKey: string): Promise<boolean> => {
    if (seenCache.current.has(storageKey)) return true;
    const seen = await checkTourSeen(storageKey);
    if (seen) seenCache.current.add(storageKey);
    return seen;
  }, []);

  const markSeen = useCallback(async (storageKey: string) => {
    seenCache.current.add(storageKey);
    await AsyncStorage.setItem(storageKey, "true");
  }, []);

  const startTour = useCallback((tour: TourConfig) => {
    setActiveTour(tour);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (currentStep < activeTour.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      markSeen(activeTour.storageKey);
      setActiveTour(null);
      setCurrentStep(0);
    }
  }, [activeTour, currentStep, markSeen]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const endTour = useCallback(() => {
    if (activeTour) {
      markSeen(activeTour.storageKey);
    }
    setActiveTour(null);
    setCurrentStep(0);
  }, [activeTour, markSeen]);

  return (
    <TourContext.Provider value={{ activeTour, currentStep, startTour, nextStep, prevStep, endTour, hasSeen, markSeen }}>
      {children}
    </TourContext.Provider>
  );
}

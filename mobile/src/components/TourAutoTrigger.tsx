import { useEffect, useRef } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTour } from "../context/TourContext";
import { getTourForPath } from "../types/tour";

export function TourAutoTrigger() {
  const { startTour, hasSeen } = useTour();
  const navigation = useNavigation();
  const route = useRoute();
  const triggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const screenName = route.name;
    if (!screenName || triggeredRef.current.has(screenName)) return;

    const tour = getTourForPath(screenName);
    if (!tour || !tour.autoShow) return;

    let cancelled = false;
    (async () => {
      const seen = await hasSeen(tour.storageKey);
      if (!seen && !cancelled) {
        triggeredRef.current.add(screenName);
        startTour(tour);
      }
    })();

    return () => { cancelled = true; };
  }, [route.name, startTour, hasSeen]);

  return null;
}

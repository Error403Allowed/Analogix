import { useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTour } from "../context/TourContext";
import { getTourForPath } from "../types/tour";

const SERVER_TOURS_KEY = "tours_completed_server";

function getActiveRouteName(state: any): string | null {
  if (!state?.routes) return null;
  const route = state.routes[state.index ?? 0];
  if (route?.state?.routes) {
    return getActiveRouteName(route.state) ?? route.name;
  }
  return route?.name ?? null;
}

export function TourAutoTrigger() {
  const { startTour, hasSeen } = useTour();
  const navigation = useNavigation();
  const [screenName, setScreenName] = useState<string | null>(null);
  const triggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = navigation.addListener("state", () => {
      const state = navigation.getState();
      setScreenName(getActiveRouteName(state));
    });
    // Set initial route name
    const state = navigation.getState();
    setScreenName(getActiveRouteName(state));
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!screenName || triggeredRef.current.has(screenName)) return;

    const tour = getTourForPath(screenName);
    if (!tour || !tour.autoShow) return;

    let cancelled = false;
    (async () => {
      const seen = await hasSeen(tour.storageKey);
      if (seen && !cancelled) return;
      // Check server-synced tours list (persists across device resets)
      const serverToursJson = await AsyncStorage.getItem(SERVER_TOURS_KEY);
      if (serverToursJson) {
        try {
          const serverTours: string[] = JSON.parse(serverToursJson);
          if (serverTours.includes(tour.id) && !cancelled) return;
        } catch { /* ignore parse errors */ }
      }
      if (!cancelled) {
        triggeredRef.current.add(screenName);
        startTour(tour);
      }
    })();

    return () => { cancelled = true; };
  }, [screenName, startTour, hasSeen]);

  return null;
}

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
}

export interface TourConfig {
  id: string;
  storageKey: string;
  steps: TourStep[];
  autoShow?: boolean;
}

const TOURS: TourConfig[] = [
  {
    id: "dashboard",
    storageKey: "tour_dashboard_seen",
    autoShow: true,
    steps: [
      { target: "dashboard-main", title: "Welcome!", description: "Your personalised dashboard shows everything at a glance." },
      { target: "streak-strip", title: "Streak", description: "Track your study streak." },
    ],
  },
  {
    id: "calendar",
    storageKey: "tour_calendar_seen",
    autoShow: true,
    steps: [
      { target: "calendar-header", title: "Calendar", description: "Keep track of exams, assignments, and events." },
    ],
  },
];

export function getTourForPath(path: string): TourConfig | null {
  const map: Record<string, string> = {
    Dashboard: "dashboard",
    Calendar: "calendar",
  };
  const tourId = map[path];
  return TOURS.find((t) => t.id === tourId) ?? null;
}

export async function hasSeenTour(storageKey: string): Promise<boolean> {
  const val = await AsyncStorage.getItem(storageKey);
  return val === "true";
}

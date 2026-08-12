export type RepeatRule = "none" | "daily" | "weekly" | "fortnightly" | "monthly";

export interface AppEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: string;
  subject?: string;
  description?: string;
  location?: string;
  color?: string;
  source: "manual" | "import";
  repeat?: RepeatRule;
  repeatEnd?: string;
}

export type EventType = AppEvent["type"];

export const AUSTRALIAN_STATES = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
] as const;
export type AustralianState = (typeof AUSTRALIAN_STATES)[number];

export const STATE_FULL_NAMES: Record<AustralianState, string> = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  ACT: "Australian Capital Territory",
  NT: "Northern Territory",
};

export const GRADES = [
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;
export type Grade = (typeof GRADES)[number];

export const LEARNING_STYLES = [
  "visual",
  "textual",
  "hands_on",
  "analogical",
] as const;
export type LearningStyle = (typeof LEARNING_STYLES)[number];

export const PRIORITIES = ["low", "medium", "high"] as const;

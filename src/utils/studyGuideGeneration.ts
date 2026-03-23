import { AppEvent } from "@/types/events";

export const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const parseAssessmentDate = (value: unknown) => {
  if (typeof value !== "string") return null;

  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return null;

  const [year, month, day] = match[0].split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, 9, 0, 0);
};

export const assessmentTypeToEventType = (value: unknown): AppEvent["type"] => {
  const type = typeof value === "string" ? value.toLowerCase() : "";

  if (/(exam|test|quiz|midterm|final)/.test(type)) return "exam";
  if (/(assignment|project|essay|report|presentation|practical|task|lab)/.test(type)) return "assignment";
  return "event";
};

export const pickStudyGuideTitle = (value: unknown, fallback = "Study Guide") => {
  if (typeof value !== "string") return fallback;

  const title = value.trim();
  if (!title) return fallback;

  // Cap at 55 chars so it fits the document title bar without overflowing
  if (title.length <= 55) return title;

  // Try to cut at last word boundary before the limit
  const cut = title.slice(0, 55).replace(/[\s\-–—,.:;]+\S*$/, "").trim();
  return (cut.length > 10 ? cut : title.slice(0, 52)) + "…";
};

export const getGenerationErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

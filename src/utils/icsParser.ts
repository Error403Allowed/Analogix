import ICAL from "ical.js";
import { AppEvent } from "@/types/events";

export const parseICS = async (file: File): Promise<AppEvent[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jcalData = ICAL.parse(content);
        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents("vevent");

        const academicKeywords = ["exam", "assessment", "quiz", "test", "midterm", "final"];
        const assignmentKeywords = ["assignment", "project", "deadline", "paper", "presentation", "lab", "due"];

        const events: AppEvent[] = vevents
          .map((vevent) => {
            const event = new ICAL.Event(vevent);
            const title = event.summary || "Untitled event";
            const description = event.description || "";
            if (!event.startDate) return null;
            const combined = (title + " " + description).toLowerCase();

            const isExam = academicKeywords.some((kw) => combined.includes(kw));
            const isAssignment = assignmentKeywords.some((kw) => combined.includes(kw));

            return {
              id: Date.now() + Math.random().toString(36).substr(2, 9),
              title: title,
              date: event.startDate.toJSDate(),
              type: isExam ? "exam" : isAssignment ? "assignment" : "event",
              description: description || "Imported from calendar",
              source: 'import'
            } as AppEvent;
          })
          .filter(e => e !== null) as AppEvent[];

        resolve(events);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

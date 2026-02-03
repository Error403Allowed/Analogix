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

        const academicKeywords = ["exam", "assessment", "quiz", "test", "midterm", "final", "assignment", "project", "deadline", "paper", "presentation", "lab", "due"];

        const events: AppEvent[] = vevents
          .map((vevent) => {
            const event = new ICAL.Event(vevent);
            const title = event.summary || "";
            const description = event.description || "";
            const combined = (title + " " + description).toLowerCase();

            // Check if it's a deadline
            const isDeadline = academicKeywords.some(kw => combined.includes(kw));
            if (!isDeadline) return null;

            return {
              id: Date.now() + Math.random().toString(36).substr(2, 9),
              title: title,
              date: event.startDate.toJSDate(),
              type: combined.includes("exam") || combined.includes("test") ? 'exam' : 
                    combined.includes("assignment") || combined.includes("project") ? 'assignment' : 'event',
              description: description || "Imported Deadline",
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

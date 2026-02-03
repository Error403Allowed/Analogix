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

        const events: AppEvent[] = vevents.map((vevent) => {
          const event = new ICAL.Event(vevent);
          return {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            title: event.summary,
            date: event.startDate.toJSDate(),
            type: 'event', // Default type for imports
            description: event.description || "Imported from Calendar",
            source: 'import'
          };
        });

        resolve(events);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

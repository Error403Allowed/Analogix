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

        const now = new Date();
        const rangeStartJs = new Date(now);
        rangeStartJs.setDate(rangeStartJs.getDate() - 30);
        const rangeEndJs = new Date(now);
        rangeEndJs.setDate(rangeEndJs.getDate() + 365);
        const rangeStart = ICAL.Time.fromJSDate(rangeStartJs, false);
        const rangeEnd = ICAL.Time.fromJSDate(rangeEndJs, false);

        const events: AppEvent[] = [];

        const pushEvent = (event: ICAL.Event, startTime: ICAL.Time, title: string, description: string) => {
          const combined = (title + " " + description).toLowerCase();
          const isExam = academicKeywords.some((kw) => combined.includes(kw));
          const isAssignment = assignmentKeywords.some((kw) => combined.includes(kw));
          const jsDate = startTime.toJSDate();
          if (jsDate < rangeStartJs || jsDate > rangeEndJs) return;

          const uid = event.uid || title || "event";
          const occurrenceId = `${uid}-${jsDate.toISOString()}`;

          events.push({
            id: occurrenceId,
            title,
            date: jsDate,
            type: isExam ? "exam" : isAssignment ? "assignment" : "event",
            description: description || "Imported from calendar",
            source: "import",
          });
        };

        vevents.forEach((vevent) => {
          const event = new ICAL.Event(vevent);
          if (!event.startDate) return;
          const title = event.summary || "Untitled event";
          const description = event.description || "";

          if (event.isRecurring()) {
            const iter = event.iterator(rangeStart);
            let next = iter.next();
            let guard = 0;
            while (next && next.compare(rangeEnd) <= 0 && guard < 1000) {
              const occurrence = event.getOccurrenceDetails(next);
              pushEvent(event, occurrence.startDate, title, description);
              next = iter.next();
              guard += 1;
            }
          } else {
            pushEvent(event, event.startDate, title, description);
          }
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

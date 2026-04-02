import { format } from "date-fns";
import { AppEvent } from "@/types/events";
import { getEventDurationMinutes } from "@/views/calendar/timeGridUtils";

export interface LayoutEvent {
  event: AppEvent;
  top: number;
  height: number;
  col: number;
  totalCols: number;
  span: number;
}

interface LayoutItem {
  event: AppEvent;
  startMin: number;
  endMin: number;
  top: number;
  height: number;
}

function layoutSingleDayEvents(items: LayoutItem[]): LayoutEvent[] {
  const result: LayoutEvent[] = [];
  const groups: LayoutItem[][] = [];
  const sortedItems = [...items].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin;
    return b.endMin - a.endMin;
  });

  let currentGroup: LayoutItem[] = [];
  let currentGroupEnd = -1;

  for (const item of sortedItems) {
    if (currentGroup.length === 0 || item.startMin < currentGroupEnd) {
      currentGroup.push(item);
      currentGroupEnd = Math.max(currentGroupEnd, item.endMin);
      continue;
    }

    groups.push(currentGroup);
    currentGroup = [item];
    currentGroupEnd = item.endMin;
  }

  if (currentGroup.length > 0) groups.push(currentGroup);

  for (const group of groups) {
    const columns: LayoutItem[][] = [];
    const itemColumns = new Map<string, number>();

    for (const item of group) {
      let columnIndex = columns.findIndex((column) => {
        const last = column[column.length - 1];
        return last.endMin <= item.startMin;
      });

      if (columnIndex === -1) {
        columnIndex = columns.length;
        columns.push([]);
      }

      columns[columnIndex].push(item);
      itemColumns.set(item.event.id, columnIndex);
    }

    for (const item of group) {
      const col = itemColumns.get(item.event.id) ?? 0;
      let span = 1;

      for (let nextColumn = col + 1; nextColumn < columns.length; nextColumn += 1) {
        const blocked = columns[nextColumn].some(
          (candidate) =>
            item.startMin < candidate.endMin && item.endMin > candidate.startMin,
        );

        if (blocked) break;
        span += 1;
      }

      result.push({
        event: item.event,
        top: item.top,
        height: item.height,
        col,
        totalCols: columns.length,
        span,
      });
    }
  }

  return result;
}

export function layoutEvents(events: AppEvent[], hourH: number): LayoutEvent[] {
  const itemsByDay = new Map<string, LayoutItem[]>();
  const eventsByDay = new Map<string, AppEvent[]>();

  for (const event of [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )) {
    const dayKey = format(new Date(event.date), "yyyy-MM-dd");

    if (!eventsByDay.has(dayKey)) eventsByDay.set(dayKey, []);
    eventsByDay.get(dayKey)!.push(event);
  }

  for (const [dayKey, dayEvents] of eventsByDay) {
    const items = dayEvents.map((event) => {
      const start = new Date(event.date);
      const startMin = start.getHours() * 60 + start.getMinutes();
      const durationMin = getEventDurationMinutes(event, 60, dayEvents);

      return {
        event,
        startMin,
        endMin: startMin + Math.max(durationMin, 30),
        top: startMin * (hourH / 60),
        height: Math.max(durationMin * (hourH / 60), 28),
      };
    });

    itemsByDay.set(dayKey, items);
  }

  return Array.from(itemsByDay.values()).flatMap((items) => layoutSingleDayEvents(items));
}

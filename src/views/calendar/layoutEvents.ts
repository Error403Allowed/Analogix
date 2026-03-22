import { format } from "date-fns";
import { AppEvent } from "@/types/events";

export interface LayoutEvent {
  event: AppEvent;
  top: number;
  height: number;
  col: number;
  totalCols: number;
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
  const clusters: LayoutItem[][] = [];

  for (const item of items) {
    let merged = false;

    for (const cluster of clusters) {
      const overlaps = cluster.some(
        (candidate) =>
          item.startMin < candidate.endMin && item.endMin > candidate.startMin,
      );

      if (!overlaps) continue;

      cluster.push(item);
      merged = true;
      break;
    }

    if (!merged) clusters.push([item]);
  }

  for (const cluster of clusters) {
    const colEnds: number[] = [];

    for (const item of cluster) {
      let col = colEnds.findIndex((end) => end <= item.startMin);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(item.endMin);
      } else {
        colEnds[col] = item.endMin;
      }

      result.push({
        event: item.event,
        top: item.top,
        height: item.height,
        col,
        totalCols: 0,
      });
    }

    const clusterCols = colEnds.length;

    for (const item of cluster) {
      const laidOut = result.find((entry) => entry.event.id === item.event.id);
      if (laidOut) laidOut.totalCols = clusterCols;
    }
  }

  return result;
}

export function layoutEvents(events: AppEvent[], hourH: number): LayoutEvent[] {
  const itemsByDay = new Map<string, LayoutItem[]>();

  for (const event of [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )) {
    const start = new Date(event.date);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const durationMin = event.endDate
      ? (new Date(event.endDate).getTime() - start.getTime()) / 60000
      : 60;
    const item: LayoutItem = {
      event,
      startMin,
      endMin: startMin + Math.max(durationMin, 30),
      top: startMin * (hourH / 60),
      height: Math.max(durationMin * (hourH / 60), 28),
    };
    const dayKey = format(start, "yyyy-MM-dd");

    if (!itemsByDay.has(dayKey)) itemsByDay.set(dayKey, []);
    itemsByDay.get(dayKey)!.push(item);
  }

  return Array.from(itemsByDay.values()).flatMap((items) =>
    layoutSingleDayEvents(items),
  );
}

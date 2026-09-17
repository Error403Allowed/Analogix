"use client";
import { X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AppEvent } from "@/types/events";
import { getTypeMeta } from "../storage";

export function TimeBlock({ event, allTypes, col, totalCols, span, height, onDelete, onMoveStart, onResizeStart, isDragging }: {
  event: AppEvent; allTypes: Record<string,{color:string;label:string;icon:string}>;
  col: number; totalCols: number; span: number; height: number;
  onDelete: () => void;
  onMoveStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeStart: (edge: "start" | "end", event: React.PointerEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
}) {
  const meta = getTypeMeta(event.type, allTypes);
  const colWidth = 100 / Math.max(totalCols, 1);
  const left = `${col * colWidth + 0.6}%`;
  const width = `${Math.max(span * colWidth - 1.2, 0)}%`;
  return (
    <div
      data-calendar-event="true"
      onPointerDown={onMoveStart}
      title={event.location ? `${event.title} · ${event.location}` : event.title}
      className={cn(
        // inset-y-0 makes the block fill the exact duration-sized slot its wrapper
        // defines. Without it the block collapses to its text height, which is what
        // made back-to-back events render with phantom gaps between them.
        "absolute inset-y-0 rounded-md px-1.5 py-1 overflow-hidden cursor-grab group hover:brightness-110 transition-all shadow-sm touch-none select-none",
        isDragging && "opacity-90 ring-1 ring-white/20 cursor-grabbing",
      )}
      style={{ left, width, backgroundColor: meta.color + "22", borderLeft: `3px solid ${meta.color}` }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onPointerDown={(pointerEvent) => onResizeStart("start", pointerEvent)}
      />
      <p className="text-[10px] font-bold truncate leading-tight" style={{ color: meta.color }}>{event.title}</p>
      {height >= 36 && <p className="text-[9px] opacity-70 leading-tight" style={{ color: meta.color }}>{format(new Date(event.date), "h:mm a")}</p>}
      {height >= 52 && event.location && <p className="text-[9px] opacity-70 leading-tight truncate" style={{ color: meta.color }}>{event.location}</p>}
      <button
        onPointerDown={(clickEvent) => clickEvent.stopPropagation()}
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded flex items-center justify-center hover:bg-black/10">
        <X className="w-2.5 h-2.5" style={{ color: meta.color }} />
      </button>
      <div
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onPointerDown={(pointerEvent) => onResizeStart("end", pointerEvent)}
      />
    </div>
  );
}

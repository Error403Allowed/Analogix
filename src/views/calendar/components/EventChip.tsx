"use client";
import type { AppEvent } from "@/types/events";
import { getTypeMeta } from "../storage";

export function EventChip({ event, allTypes, onClick }: { event: AppEvent; allTypes: Record<string,{color:string;label:string;icon:string}>; onClick?: () => void }) {
  const meta = getTypeMeta(event.type, allTypes);
  return (
    <button onClick={onClick}
      className="w-full text-left flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold truncate hover:opacity-80 transition-opacity group"
      style={{ backgroundColor: meta.color + "18", color: meta.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
      <span className="truncate">{event.title}</span>
    </button>
  );
}

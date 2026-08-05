"use client";

import {
  Check,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ICSUploader from "@/components/ICSUploader";
import type { AppEvent } from "@/types/events";
import { MiniCalendar } from "./MiniCalendar";

export type CalendarRailProps = {
  date: Date;
  events: AppEvent[];
  allTypes: Record<string, { color: string; label: string; icon: string }>;
  termInfo: ReturnType<typeof import("@/utils/termData").getTermInfo> | null;
  filterType: string;
  onFilterChange: (key: string) => void;
  timeStr: string;
  tzStr: string;
  eventCount: number;
  showUploader: boolean;
  onToggleUploader: () => void;
  onSelectDay: (d: Date) => void;
  onOpenCreate: (day: Date) => void;
  onManageTags: () => void;
  onClearAll: () => void;
};

export function CalendarRail({
  date,  events,
  allTypes,
  termInfo,
  filterType,
  onFilterChange,
  timeStr,
  tzStr,
  eventCount,
  showUploader,
  onToggleUploader,
  onSelectDay,
  onOpenCreate,
  onManageTags,
  onClearAll,
}: CalendarRailProps) {
  return (
    <div className="flex flex-col gap-5 overflow-y-auto px-4 py-5">
      <button
        onClick={() => onOpenCreate(date)}
        className="flex w-full items-center gap-2.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" /> Create
      </button>

      <div className="text-center">
        <p className="text-lg font-black text-foreground tabular-nums">{timeStr}</p>
        <p className="text-[9px] font-medium text-muted-foreground/50">{tzStr}</p>
      </div>

      <MiniCalendar date={date} events={events} onSelect={onSelectDay} />

      {termInfo && (
        <div className="rounded-xl bg-primary/8 border border-primary/20 px-3 py-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-0.5">Current Term</p>
          <p className="text-xs font-bold text-primary">{termInfo.term.label}</p>
          <p className="text-[10px] font-medium text-primary/70">Week {termInfo.week}</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Tags</p>
          <button onClick={onManageTags} className="flex items-center gap-0.5 text-[9px] font-bold text-primary hover:underline">
            <Pencil className="h-2.5 w-2.5" /> Manage
          </button>
        </div>
        <div className="space-y-0.5">
          <button
            onClick={() => onFilterChange("all")}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left",
              filterType === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            <span className="w-2 h-2 rounded-full bg-foreground/30" /> All Events
          </button>
          {Object.entries(allTypes).map(([key, m]) => (
            <button
              key={key}
              onClick={() => onFilterChange(filterType === key ? "all" : key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left",
                filterType === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
              {m.label}
              {filterType === key && <Check className="w-3 h-3 ml-auto text-primary" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-1">
        <button
          onClick={onToggleUploader}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" /> Import .ics
        </button>
        {showUploader && (
          <div className="overflow-hidden">
            <ICSUploader allTypes={allTypes} />
          </div>
        )}
        {eventCount > 0 && (
          <button
            onClick={onClearAll}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-destructive/20 text-xs font-semibold text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>
    </div>
  );
}

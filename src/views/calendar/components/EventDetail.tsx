"use client";
import { X, Clock, Tag, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { AppEvent } from "@/types/events";
import { getTypeMeta } from "../storage";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetClose,
} from "@/components/ui/responsive-sheet";

export function EventDetail({ event, allTypes, onClose, onDelete }: { event: AppEvent; allTypes: Record<string,{color:string;label:string;icon:string}>; onClose: () => void; onDelete: () => void }) {
  const meta = getTypeMeta(event.type, allTypes);
  return (
    <ResponsiveSheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <ResponsiveSheetContent className="sm:max-w-sm p-0">
        <ResponsiveSheetClose className="md:hidden absolute right-3 top-3 z-20 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
          <X className="w-4 h-4" />
        </ResponsiveSheetClose>
        <div className="h-1.5 w-full" style={{ backgroundColor: meta.color }} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: meta.color }}>{meta.label}</span>
                {event.subject && <span className="flex items-center gap-1 text-[9px] text-muted-foreground font-semibold"><Tag className="w-2.5 h-2.5" />{event.subject}</span>}
              </div>
              <h3 className="text-base font-bold text-foreground">{event.title}</h3>
            </div>
          </div>
          {event.description && <p className="text-xs text-muted-foreground leading-relaxed mb-4">{event.description}</p>}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{format(new Date(event.date), "EEEE, MMMM d 'at' h:mm a")}</span>
          </div>
          {event.endDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Clock className="w-3.5 h-3.5 opacity-0" />
              <span>Ends {format(new Date(event.endDate), "h:mm a")}</span>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button onClick={() => { onDelete(); onClose(); }}
            className="flex items-center gap-1.5 text-xs text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors font-semibold">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

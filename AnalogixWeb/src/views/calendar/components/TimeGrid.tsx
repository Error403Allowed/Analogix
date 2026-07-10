"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format, setHours, setMinutes, isToday, isSameDay, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { HOURS, HOUR_H } from "../constants";
import { getEventStartMinutes, getEventDurationMinutes, snapMinutes, normalizeMinuteRange, clampEventStartMinutes, minutesToDate } from "@/views/calendar/timeGridUtils";
import { layoutEvents } from "@/views/calendar/layoutEvents";
import { DEFAULT_EVENT_DURATION_MINUTES } from "@/views/calendar/timeGridUtils";
import type { AppEvent } from "@/types/events";
import type { GridInteraction } from "../types";
import { TimeBlock } from "./TimeBlock";

export function TimeGrid({ days, events, allTypes, now, onDelete, onSelect, onCreateSelection, onUpdateEvent }: {
  days: Date[]; events: AppEvent[];
  allTypes: Record<string,{color:string;label:string;icon:string}>;
  now: Date; onDelete: (id: string) => void; onSelect: (e: AppEvent) => void;
  onCreateSelection: (day: Date, startMin: number, endMin: number) => void;
  onUpdateEvent: (id: string, updates: Pick<AppEvent, "date" | "endDate">) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [interaction, setInteraction] = useState<GridInteraction | null>(null);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow = days.some(d => isToday(d));

  useEffect(() => {
    const scrollTop = Math.max(0, nowMinutes * (HOUR_H / 60) - 200);
    containerRef.current?.scrollTo({ top: scrollTop, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!interaction) return;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = interaction.kind === "move" ? "grabbing" : "ns-resize";
    return () => { document.body.style.cursor = previousCursor; };
  }, [interaction]);

  const getPointerSlot = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    const columns = columnsRef.current;
    if (!container || !columns || days.length === 0) return null;

    const rect = columns.getBoundingClientRect();
    const dayWidth = rect.width / days.length;
    const relativeX = Math.min(Math.max(clientX - rect.left, 0), Math.max(rect.width - 1, 0));
    const relativeY = clientY - rect.top + container.scrollTop - HOUR_H / 2;

    return {
      dayIndex: Math.min(Math.max(Math.floor(relativeX / Math.max(dayWidth, 1)), 0), days.length - 1),
      minutes: snapMinutes(relativeY / (HOUR_H / 60)),
    };
  }, [days.length]);

  const previewEvent = useMemo(() => {
    if (!interaction || interaction.kind === "create") return null;
    const sourceEvent = events.find((event) => event.id === interaction.eventId);
    if (!sourceEvent) return null;

    if (interaction.kind === "move") {
      const day = days[interaction.previewDayIndex];
      const startDate = minutesToDate(day, interaction.previewStartMin);
      const endDate = minutesToDate(day, interaction.previewStartMin + interaction.durationMin);
      return { ...sourceEvent, date: startDate, endDate };
    }

    const day = days[interaction.dayIndex];
    return {
      ...sourceEvent,
      date: minutesToDate(day, interaction.previewStartMin),
      endDate: minutesToDate(day, interaction.previewEndMin),
    };
  }, [days, events, interaction]);

  const displayEvents = useMemo(() => {
    if (!previewEvent) return events;
    return events.map((event) => event.id === previewEvent.id ? previewEvent : event);
  }, [events, previewEvent]);

  const getSiblingDayEvents = useCallback((event: AppEvent) => (
    events.filter((candidate) => isSameDay(new Date(candidate.date), new Date(event.date)))
  ), [events]);

  useEffect(() => {
    if (!interaction) return;

    const hasMovedEnough = (clientX: number, clientY: number, startClientX: number, startClientY: number) =>
      Math.abs(clientX - startClientX) > 4 || Math.abs(clientY - startClientY) > 4;

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== interaction.pointerId) return;
      const slot = getPointerSlot(pointerEvent.clientX, pointerEvent.clientY);
      if (!slot) return;

      setInteraction((current) => {
        if (!current || current.pointerId !== pointerEvent.pointerId) return current;

        if (current.kind === "create") {
          const didDrag = current.didDrag || hasMovedEnough(pointerEvent.clientX, pointerEvent.clientY, current.startClientX, current.startClientY);
          if (!didDrag) return current;
          const { startMin, endMin } = normalizeMinuteRange(current.anchorMin, slot.minutes);
          return { ...current, didDrag: true, startMin, endMin };
        }

        if (current.kind === "move") {
          const didDrag = current.didDrag || hasMovedEnough(pointerEvent.clientX, pointerEvent.clientY, current.startClientX, current.startClientY);
          if (!didDrag) return current;
          const nextStartMin = clampEventStartMinutes(snapMinutes(slot.minutes - current.pointerOffsetMin), current.durationMin);
          return { ...current, didDrag: true, previewDayIndex: slot.dayIndex, previewStartMin: nextStartMin };
        }

        const didDrag = current.didDrag || hasMovedEnough(pointerEvent.clientX, pointerEvent.clientY, current.startClientX, current.startClientY);
        if (!didDrag) return current;

        if (current.edge === "start") {
          const { startMin } = normalizeMinuteRange(slot.minutes, current.previewEndMin);
          return { ...current, didDrag: true, previewStartMin: startMin };
        }

        const { endMin } = normalizeMinuteRange(current.previewStartMin, slot.minutes);
        return { ...current, didDrag: true, previewEndMin: endMin };
      });
    };

    const handlePointerUp = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== interaction.pointerId) return;
      const current = interaction;
      setInteraction(null);

      if (current.kind === "create") {
        const startMin = current.didDrag ? current.startMin : clampEventStartMinutes(current.anchorMin, DEFAULT_EVENT_DURATION_MINUTES);
        const endMin = current.didDrag ? current.endMin : Math.min(startMin + DEFAULT_EVENT_DURATION_MINUTES, 24 * 60);
        onCreateSelection(days[current.dayIndex], startMin, endMin);
        return;
      }

      const sourceEvent = events.find((event) => event.id === current.eventId);
      if (!sourceEvent) return;

      if (current.kind === "move") {
        if (!current.didDrag) { onSelect(sourceEvent); return; }
        const nextDay = days[current.previewDayIndex];
        const nextStart = minutesToDate(nextDay, current.previewStartMin);
        const nextEnd = minutesToDate(nextDay, current.previewStartMin + current.durationMin);
        if (nextStart.getTime() === new Date(sourceEvent.date).getTime() && nextEnd.getTime() === addMinutes(new Date(sourceEvent.date), current.durationMin).getTime()) return;
        onUpdateEvent(sourceEvent.id, { date: nextStart, endDate: nextEnd });
        return;
      }

      if (!current.didDrag) return;
      const nextDay = days[current.dayIndex];
      const nextStart = minutesToDate(nextDay, current.previewStartMin);
      const nextEnd = minutesToDate(nextDay, current.previewEndMin);
      const sourceDurationMinutes = getEventDurationMinutes(sourceEvent, DEFAULT_EVENT_DURATION_MINUTES, getSiblingDayEvents(sourceEvent));
      if (nextStart.getTime() === new Date(sourceEvent.date).getTime() && nextEnd.getTime() === addMinutes(new Date(sourceEvent.date), sourceDurationMinutes).getTime()) return;
      onUpdateEvent(sourceEvent.id, { date: nextStart, endDate: nextEnd });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [days, events, getPointerSlot, interaction, onCreateSelection, onSelect, onUpdateEvent]);

  const startCreateInteraction = (dayIndex: number, pointerEvent: React.PointerEvent<HTMLDivElement>) => {
    if (pointerEvent.button !== 0) return;
    if (pointerEvent.target instanceof HTMLElement && pointerEvent.target.closest("[data-calendar-event='true']")) return;
    const slot = getPointerSlot(pointerEvent.clientX, pointerEvent.clientY);
    if (!slot) return;
    pointerEvent.preventDefault();
    setInteraction({
      kind: "create", pointerId: pointerEvent.pointerId, dayIndex, anchorMin: slot.minutes,
      startMin: slot.minutes, endMin: Math.min(slot.minutes + DEFAULT_EVENT_DURATION_MINUTES, 24 * 60),
      startClientX: pointerEvent.clientX, startClientY: pointerEvent.clientY, didDrag: false,
    });
  };

  const startMoveInteraction = (event: AppEvent, pointerEvent: React.PointerEvent<HTMLDivElement>) => {
    if (pointerEvent.button !== 0) return;
    const slot = getPointerSlot(pointerEvent.clientX, pointerEvent.clientY);
    const dayIndex = days.findIndex((day) => isSameDay(day, new Date(event.date)));
    if (!slot || dayIndex === -1) return;
    const startMinutes = getEventStartMinutes(event);
    const durationMinutes = getEventDurationMinutes(event, DEFAULT_EVENT_DURATION_MINUTES, getSiblingDayEvents(event));
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    setInteraction({
      kind: "move", pointerId: pointerEvent.pointerId, eventId: event.id,
      previewDayIndex: dayIndex, previewStartMin: startMinutes, durationMin: durationMinutes,
      pointerOffsetMin: Math.min(Math.max(slot.minutes - startMinutes, 0), durationMinutes),
      startClientX: pointerEvent.clientX, startClientY: pointerEvent.clientY, didDrag: false,
    });
  };

  const startResizeInteraction = (event: AppEvent, edge: "start" | "end", pointerEvent: React.PointerEvent<HTMLDivElement>) => {
    if (pointerEvent.button !== 0) return;
    const dayIndex = days.findIndex((day) => isSameDay(day, new Date(event.date)));
    if (dayIndex === -1) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    const startMinutes = getEventStartMinutes(event);
    const endMinutes = startMinutes + getEventDurationMinutes(event, DEFAULT_EVENT_DURATION_MINUTES, getSiblingDayEvents(event));
    setInteraction({
      kind: "resize", pointerId: pointerEvent.pointerId, eventId: event.id, edge, dayIndex,
      previewStartMin: startMinutes, previewEndMin: endMinutes,
      startClientX: pointerEvent.clientX, startClientY: pointerEvent.clientY, didDrag: false,
    });
  };

  return (
    <div ref={containerRef} className="flex overflow-y-auto flex-1 min-h-0">
      <div className="w-14 shrink-0 relative bg-background z-10">
        <div style={{ height: HOUR_H / 2 }} />
        {HOURS.map(h => (
          <div key={h} className="relative" style={{ height: HOUR_H }}>
            {h > 0 && (
              <span className="absolute -top-2.5 right-2 text-[9px] font-semibold text-muted-foreground/60 tabular-nums select-none">
                {format(setHours(setMinutes(new Date(), 0), h), "h a")}
              </span>
            )}
          </div>
        ))}
      </div>
      <div ref={columnsRef} className="flex flex-1 relative">
        {showNow && (
          <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
            style={{ top: HOUR_H / 2 + nowMinutes * (HOUR_H / 60) }}>
            <div className="w-2 h-2 rounded-full bg-red-500 ml-0.5 shrink-0" />
            <div className="flex-1 h-px bg-red-500/70" />
          </div>
        )}
        {days.map((day, di) => {
          const dayEvents = displayEvents.filter(e => isSameDay(new Date(e.date), day));
          const laid: any = layoutEvents(dayEvents, HOUR_H);
          const createPreview = interaction?.kind === "create" && interaction.dayIndex === di
            ? {
                startMin: interaction.didDrag ? interaction.startMin : clampEventStartMinutes(interaction.anchorMin, DEFAULT_EVENT_DURATION_MINUTES),
                endMin: interaction.didDrag ? interaction.endMin : Math.min(clampEventStartMinutes(interaction.anchorMin, DEFAULT_EVENT_DURATION_MINUTES) + DEFAULT_EVENT_DURATION_MINUTES, 24 * 60),
              }
            : null;
          return (
            <div key={di} className="relative flex-1 border-r border-border/40 last:border-r-0"
              onPointerDown={(pointerEvent) => startCreateInteraction(di, pointerEvent)}>
              <div style={{ height: HOUR_H / 2 }} />
              {HOURS.map(h => (
                <div key={h} className="border-t border-border/20 hover:bg-primary/5 transition-colors cursor-pointer group relative" style={{ height: HOUR_H }}>
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[9px] font-bold text-primary/50">+</span>
                  </span>
                </div>
              ))}
              {HOURS.map(h => (
                <div key={`half-${h}`} className="absolute left-0 right-0 border-t border-border/10 pointer-events-none"
                  style={{ top: HOUR_H / 2 + h * HOUR_H + HOUR_H / 2 }} />
              ))}
              {createPreview && (
                <div className="absolute left-[3%] right-[3%] rounded-xl border border-dashed border-primary/50 bg-primary/15 pointer-events-none"
                  style={{ top: createPreview.startMin * (HOUR_H / 60) + HOUR_H / 2, height: Math.max((createPreview.endMin - createPreview.startMin) * (HOUR_H / 60), 18) }}>
                  <div className="px-2 py-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary/80">New event</p>
                  </div>
                </div>
              )}
              {laid.map(({ event, top, height, col, totalCols, span }) => (
                <div key={event.id} className="absolute left-0 right-0" style={{ top: top + HOUR_H / 2, height }}>
                  <TimeBlock event={event} allTypes={allTypes} col={col} totalCols={totalCols} span={span} height={height}
                    onDelete={() => onDelete(event.id)}
                    onMoveStart={(pointerEvent) => startMoveInteraction(event, pointerEvent)}
                    onResizeStart={(edge, pointerEvent) => startResizeInteraction(event, edge, pointerEvent)}
                    isDragging={!!interaction && interaction.kind !== "create" && interaction.eventId === event.id} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, Clock,
  Trash2, Search, Upload, LayoutGrid,
  List, AlignLeft, Columns, Check, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks,
  addMonths, subMonths,
  isSameDay, isToday, format,
  addDays, subDays,
} from "date-fns";
import ICSUploader from "@/components/ICSUploader";
import { eventStore } from "@/utils/eventStore";
import { AppEvent } from "@/types/events";
import { getTermInfo, getStoredState } from "@/utils/termData";

import { toast } from "sonner";
import { CalendarView, CustomEventType } from "./calendar/types";
import { useNow } from "./calendar/hooks/useNow";
import { loadCustomTypes, loadDeletedBuiltins, loadBuiltinOverrides, saveCustomTypes, saveDeletedBuiltins, saveBuiltinOverrides, buildCustomTypeCandidate, getAllTypes, getTypeMeta } from "./calendar/storage";
import { MiniCalendar } from "./calendar/components/MiniCalendar";
import { MonthView } from "./calendar/components/MonthView";
import { WeekGridView } from "./calendar/components/WeekGridView";
import { TimeGrid } from "./calendar/components/TimeGrid";
import { ScheduleView } from "./calendar/components/ScheduleView";
import { CreateEventModal } from "./calendar/components/CreateEventModal";
import { EventDetail } from "./calendar/components/EventDetail";
import { ManageTagsModal } from "./calendar/components/ManageTagsModal";

const CalendarPage = () => {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ date: Date; startMin?: number; endMin?: number } | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [showManageTags, setShowManageTags] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [customTypes, setCustomTypes] = useState<CustomEventType[]>(() => loadCustomTypes());
  const [deletedBuiltins, setDeletedBuiltins] = useState<string[]>(() => loadDeletedBuiltins());
  const [builtinOverrides, setBuiltinOverrides] = useState(() => loadBuiltinOverrides());
  const searchRef = useRef<HTMLInputElement>(null);
  const now = useNow();

  const allTypes = useMemo(
    () => getAllTypes(customTypes, deletedBuiltins, builtinOverrides),
    [customTypes, deletedBuiltins, builtinOverrides],
  );

  const loadEvents = useCallback(() => eventStore.getAll().then(setEvents), []);
  useEffect(() => {
    loadEvents();
    window.addEventListener("eventsUpdated", loadEvents);
    return () => window.removeEventListener("eventsUpdated", loadEvents);
  }, [loadEvents]);

  const [termInfo, setTermInfo] = useState<ReturnType<typeof getTermInfo> | null>(null);
  useEffect(() => {
    const userState = getStoredState();
    setTermInfo(userState ? getTermInfo(date, userState) : null);
  }, [date]);

  const filteredEvents = useMemo(() => events.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.subject?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q);
    const matchType = filterType === "all" || e.type === filterType;
    return matchSearch && matchType;
  }), [events, search, filterType]);

  const upcomingEvents = useMemo(() =>
    filteredEvents.filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 8),
    [filteredEvents, now]);

  const openCreate = (day: Date, startMin?: number, endMin?: number) => {
    setDate(day);
    setCreateDefaults({ date: day, startMin, endMin });
    setShowCreate(true);
  };

  const handleSaveEvent = (event: AppEvent) => {
    void eventStore.add(event);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this event?")) return;
    void eventStore.remove(id);
  };

  const handleAddCustomType = useCallback((label: string, icon: string, color: string) => {
    const candidate = buildCustomTypeCandidate(label, icon, color, allTypes);
    if (!candidate.customType) {
      toast.error(candidate.error ?? "Failed to create tag");
      return null;
    }

    const nextCustomTypes = customTypes.some((type) => type.key === candidate.customType?.key)
      ? customTypes
      : [...customTypes, candidate.customType];
    setCustomTypes(nextCustomTypes);
    saveCustomTypes(nextCustomTypes);
    toast.success(`Added "${candidate.customType.label}"`);
    return candidate.customType;
  }, [allTypes, customTypes]);

  const handleUpdateEvent = useCallback((id: string, updates: Pick<AppEvent, "date" | "endDate">) => {
    setEvents((current) =>
      current.map((event) => event.id === id ? { ...event, ...updates } : event),
    );
    void eventStore.update(id, updates);
  }, []);

  const navigate = (dir: 1 | -1) => {
    if (view === "month") setDate(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
    else if (view === "week") setDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setDate(d => dir === 1 ? addDays(d, 1) : subDays(d, 1));
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  });

  const navLabel =
    view === "month" ? format(date, "MMMM yyyy")
    : view === "week" ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`
    : view === "schedule" ? "All Events"
    : format(date, "EEEE, MMMM d");

  const viewIcons: Record<CalendarView, React.ReactNode> = {
    month:    <LayoutGrid className="w-3.5 h-3.5" />,
    week:     <Columns className="w-3.5 h-3.5" />,
    day:      <AlignLeft className="w-3.5 h-3.5" />,
    schedule: <List className="w-3.5 h-3.5" />,
  };

  const selectedDayEvents = filteredEvents
    .filter(e => isSameDay(new Date(e.date), date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const [timeStr, setTimeStr] = useState("");
  const [tzStr, setTzStr] = useState("");
  useEffect(() => {
    setTimeStr(format(now, "h:mm a"));
    setTzStr(Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " "));
  }, [now]);

  return (
    <div className="flex bg-background overflow-hidden" style={{ height: "100%" }}>

      <aside className="w-[220px] shrink-0 border-r border-border/40 flex flex-col gap-5 px-4 py-5 overflow-y-auto">
        <button onClick={() => openCreate(date)}
          className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 transition-all hover:shadow-md active:scale-[0.98]">
          <Plus className="w-4 h-4" /> Create
        </button>

        <div className="text-center">
          <p className="text-lg font-black text-foreground tabular-nums">{timeStr}</p>
          <p className="text-[9px] text-muted-foreground/50 font-medium">{tzStr}</p>
        </div>

        <MiniCalendar date={date} events={filteredEvents} onSelect={setDate} />

        {termInfo && (
          <div className="rounded-xl bg-primary/8 border border-primary/20 px-3 py-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-0.5">Current Term</p>
            <p className="text-xs font-bold text-primary">{termInfo.term.label}</p>
            <p className="text-[10px] text-primary/70 font-medium">Week {termInfo.week}</p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Tags</p>
            <button onClick={() => setShowManageTags(true)} className="text-[9px] font-bold text-primary hover:underline flex items-center gap-0.5">
              <Pencil className="w-2.5 h-2.5" /> Manage
            </button>
          </div>
          <div className="space-y-0.5">
            <button onClick={() => setFilterType("all")}
              className={cn("w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left",
                filterType === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
              <span className="w-2 h-2 rounded-full bg-foreground/30" /> All Events
            </button>
            {Object.entries(allTypes).map(([key, m]) => (
              <button key={key} onClick={() => setFilterType(filterType === key ? "all" : key)}
                className={cn("w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left",
                  filterType === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                {m.label}
                {filterType === key && <Check className="w-3 h-3 ml-auto text-primary" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-1">
          <button onClick={() => setShowUploader(s => !s)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            <Upload className="w-3.5 h-3.5" /> Import .ics
          </button>
          <AnimatePresence>
            {showUploader && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <ICSUploader allTypes={allTypes} />
              </motion.div>
            )}
          </AnimatePresence>
          {events.length > 0 && (
            <button onClick={() => { if (confirm(`Clear all ${events.length} events?`)) eventStore.clearAll(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-destructive/20 text-xs font-semibold text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setDate(new Date())}
              className={cn("px-3 h-8 rounded-lg border text-xs font-bold transition-all",
                isToday(date) ? "border-primary/40 bg-primary/8 text-primary" : "border-border hover:bg-muted text-muted-foreground hover:text-foreground")}>
              Today
            </button>
            <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <h2 className="text-base font-black text-foreground min-w-[180px]">{navLabel}</h2>
          <div className="ml-auto flex items-center gap-2">
            <AnimatePresence>
              {showSearch && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }} exit={{ width: 0, opacity: 0 }}>
                  <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…"
                    className="w-full text-xs bg-muted/50 border border-border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20" />
                </motion.div>
              )}
            </AnimatePresence>
            <button onClick={() => { setShowSearch(s => !s); if (!showSearch) setTimeout(() => searchRef.current?.focus(), 100); }}
              className={cn("w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                showSearch ? "bg-muted border-border text-foreground" : "border-border hover:bg-muted text-muted-foreground hover:text-foreground")}>
              <Search className="w-3.5 h-3.5" />
            </button>
            <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/50">
              {(["month","week","day","schedule"] as CalendarView[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all",
                    view === v ? "bg-background text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground")}>
                  {viewIcons[v]}<span className="hidden sm:inline capitalize">{v}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === "day" && (
          <div className="flex items-center justify-center gap-4 py-3 border-b border-border/40 shrink-0">
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{format(date, "EEEE")}</p>
              <p className={cn("text-3xl font-black", isToday(date) ? "text-primary" : "text-foreground/80")}>{format(date, "d")}</p>
              <p className="text-[10px] text-muted-foreground/60">{format(date, "MMMM yyyy")}</p>
            </div>
          </div>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={view + format(date, "yyyy-MM")} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {view === "month" && <MonthView date={date} events={filteredEvents} allTypes={allTypes} onSelectDay={setDate} onSelectEvent={setSelectedEvent} onClickCreate={d => openCreate(d)} />}
              {view === "week" && (
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="flex shrink-0 border-b border-border/40">
                    <div className="w-14 shrink-0" />
                    {weekDays.map((day) => {
                      const isTod = isToday(day);
                      const isSelected = isSameDay(day, date);
                      return (
                        <button key={day.toISOString()} onClick={() => setDate(day)}
                          className={cn("flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors hover:bg-muted/30 border-r border-border/30 last:border-r-0", isSelected && "bg-primary/5")}>
                          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">{format(day, "EEE")}</span>
                          <span className={cn("text-sm font-black w-7 h-7 flex items-center justify-center rounded-full transition-all",
                            isTod ? "bg-primary text-primary-foreground" : isSelected ? "text-primary" : "text-foreground/80")}>
                            {format(day, "d")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <TimeGrid
                    days={weekDays} events={filteredEvents} allTypes={allTypes} now={now}
                    onDelete={handleDelete} onSelect={setSelectedEvent}
                    onCreateSelection={(day, startMin, endMin) => openCreate(day, startMin, endMin)}
                    onUpdateEvent={handleUpdateEvent}
                  />
                </div>
              )}
              {view === "day" && (
                <TimeGrid
                  days={[date]} events={filteredEvents} allTypes={allTypes} now={now}
                  onDelete={handleDelete} onSelect={setSelectedEvent}
                  onCreateSelection={(day, startMin, endMin) => openCreate(day, startMin, endMin)}
                  onUpdateEvent={handleUpdateEvent}
                />
              )}
              {view === "schedule" && <ScheduleView events={filteredEvents} allTypes={allTypes} onSelectEvent={setSelectedEvent} onDelete={handleDelete} />}
            </motion.div>
          </AnimatePresence>

          {(view === "month" || view === "week") && (
            <aside className="w-[260px] shrink-0 border-l border-border/40 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border/40">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{format(date, "EEEE")}</p>
                    <p className="text-sm font-black text-foreground">{format(date, "MMMM d")}</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{selectedDayEvents.length}</span>
                </div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {selectedDayEvents.length === 0
                    ? <p className="text-[10px] text-muted-foreground/50 text-center py-4">Nothing here</p>
                    : selectedDayEvents.map(e => {
                        const meta = getTypeMeta(e.type, allTypes);
                        return (
                          <button key={e.id} onClick={() => setSelectedEvent(e)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left group">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-foreground truncate">{e.title}</p>
                              <p className="text-[9px] text-muted-foreground/60">{format(new Date(e.date), "h:mm a")}{e.endDate && ` – ${format(new Date(e.endDate), "h:mm a")}`}</p>
                            </div>
                          </button>
                        );
                      })}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Upcoming</p>
                  <button onClick={() => setView("schedule")} className="text-[9px] font-bold text-primary hover:underline">View all</button>
                </div>
                <div className="space-y-1.5">
                  {upcomingEvents.length === 0
                    ? <p className="text-[10px] text-muted-foreground/50 text-center py-6">No upcoming events</p>
                    : upcomingEvents.map(e => {
                        const meta = getTypeMeta(e.type, allTypes);
                        return (
                          <button key={e.id} onClick={() => setSelectedEvent(e)}
                            className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
                            <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: meta.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-foreground truncate">{e.title}</p>
                              <p className="text-[9px] text-muted-foreground/60">
                                {isToday(new Date(e.date)) ? "Today" : format(new Date(e.date), "MMM d")} · {format(new Date(e.date), "h:mm a")}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreate && <CreateEventModal
          defaultDate={createDefaults?.date ?? date}
          defaultStartMin={createDefaults?.startMin}
          defaultEndMin={createDefaults?.endMin}
          allTypes={allTypes}
          onClose={() => { setShowCreate(false); setCreateDefaults(null); }}
          onSave={handleSaveEvent}
          onManageTags={() => setShowManageTags(true)}
          onCreateTag={handleAddCustomType}
        />}
        {selectedEvent && <EventDetail event={selectedEvent} allTypes={allTypes} onClose={() => setSelectedEvent(null)} onDelete={() => { handleDelete(selectedEvent.id); setSelectedEvent(null); }} />}
        {showManageTags && (
          <ManageTagsModal
            customTypes={customTypes}
            deletedBuiltins={deletedBuiltins}
            builtinOverrides={builtinOverrides}
            onClose={() => setShowManageTags(false)}
            onChange={setCustomTypes}
            onDeletedBuiltinsChange={setDeletedBuiltins}
            onBuiltinOverridesChange={setBuiltinOverrides}
            onAddCustomType={handleAddCustomType}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarPage;

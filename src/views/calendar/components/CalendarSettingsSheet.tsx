"use client";

import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
} from "@/components/ui/responsive-sheet";
import {
  DEFAULT_CALENDAR_SETTINGS,
  type CalendarDensity,
  type CalendarSettings,
  type WeekStartsOn,
} from "../settings";
import type { CalendarView } from "../types";

const VIEW_OPTIONS: { key: CalendarView; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "schedule", label: "Schedule" },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">{title}</p>
      <div className="rounded-2xl border border-border/60 divide-y divide-border/40 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Row({ label, hint, control }: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Segmented<T extends string | number>({ options, value, onPick, testIdPrefix }: {
  options: readonly { key: T; label: string }[];
  value: T;
  onPick: (key: T) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/50">
      {options.map(o => (
        <button key={String(o.key)} data-testid={`${testIdPrefix}-${o.key}`}
          onClick={() => onPick(o.key)}
          className={cn("px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
            value === o.key ? "bg-background text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CalendarSettingsSheet({ open, onOpenChange, settings, onChange, allTypes, onManageTags }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CalendarSettings;
  onChange: (patch: Partial<CalendarSettings>) => void;
  allTypes: Record<string, { color: string; label: string; icon: string }>;
  onManageTags: () => void;
}) {
  const toggleHidden = (key: string) => {
    const hidden = settings.hiddenTags.includes(key)
      ? settings.hiddenTags.filter(t => t !== key)
      : [...settings.hiddenTags, key];
    onChange({ hiddenTags: hidden });
  };

  const setWorkStart = (v: number) => {
    const start = Math.min(Math.max(v, 0), 23);
    onChange({ workDayStart: start, workDayEnd: Math.max(settings.workDayEnd, start + 1) });
  };
  const setWorkEnd = (v: number) => {
    const end = Math.min(Math.max(v, 1), 24);
    onChange({ workDayEnd: end, workDayStart: Math.min(settings.workDayStart, end - 1) });
  };

  const hourLabel = (h: number) => h === 24 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`;

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-md">
        <ResponsiveSheetHeader>
          <ResponsiveSheetTitle>Calendar settings</ResponsiveSheetTitle>
        </ResponsiveSheetHeader>
        <div className="px-5 pb-6 space-y-5 max-h-[70vh] overflow-y-auto overscroll-contain">
          <Section title="View">
            <Row label="Default view" hint="The view you land on when opening the calendar"
              control={
                <Segmented testIdPrefix="cal-default-view"
                  options={VIEW_OPTIONS} value={settings.defaultView}
                  onPick={(key) => onChange({ defaultView: key })} />
              } />
            <Row label="Week starts on"
              control={
                <Segmented testIdPrefix="cal-week-start"
                  options={[{ key: 1, label: "Mon" }, { key: 0, label: "Sun" }] as { key: WeekStartsOn; label: string }[]}
                  value={settings.weekStartsOn}
                  onPick={(key) => onChange({ weekStartsOn: key })} />
              } />
            <Row label="Show weekends" hint="Hide Saturdays and Sundays from week and month views"
              control={
                <Switch data-testid="cal-show-weekends" checked={settings.showWeekends}
                  onCheckedChange={(v) => onChange({ showWeekends: v })} />
              } />
          </Section>

          <Section title="Display">
            <Row label="Density"
              control={
                <Segmented testIdPrefix="cal-density"
                  options={[{ key: "comfortable", label: "Comfortable" }, { key: "compact", label: "Compact" }] as { key: CalendarDensity; label: string }[]}
                  value={settings.density}
                  onPick={(key) => onChange({ density: key })} />
              } />
            <Row label="Work hours only" hint="Collapse the time grid to your work day"
              control={
                <Switch data-testid="cal-work-hours-only" checked={settings.workHoursOnly}
                  onCheckedChange={(v) => onChange({ workHoursOnly: v })} />
              } />
            {settings.workHoursOnly && (
              <Row label="Work day" hint={`${hourLabel(settings.workDayStart)} – ${hourLabel(settings.workDayEnd)}`}
                control={
                  <div className="flex items-center gap-1.5">
                    <select data-testid="cal-work-start" value={settings.workDayStart}
                      onChange={e => setWorkStart(Number(e.target.value))}
                      className="text-xs bg-muted/40 border border-border rounded-lg px-2 py-1.5 outline-none">
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>{hourLabel(h)}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-muted-foreground">to</span>
                    <select data-testid="cal-work-end" value={settings.workDayEnd}
                      onChange={e => setWorkEnd(Number(e.target.value))}
                      className="text-xs bg-muted/40 border border-border rounded-lg px-2 py-1.5 outline-none">
                      {Array.from({ length: 24 }, (_, h) => h + 1).map(h => (
                        <option key={h} value={h}>{hourLabel(h)}</option>
                      ))}
                    </select>
                  </div>
                } />
            )}
            <Row label="Default event length" hint="Used when creating events"
              control={
                <Segmented testIdPrefix="cal-duration"
                  options={DURATION_OPTIONS.map(d => ({ key: d, label: `${d}m` }))} value={settings.defaultDurationMinutes}
                  onPick={(key) => onChange({ defaultDurationMinutes: key })} />
              } />
          </Section>

          <Section title="Tags">
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-foreground mb-1">Visible tags</p>
              <p className="text-[10px] text-muted-foreground mb-2">Hidden tags are filtered out of every view.</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(allTypes).map(([key, m]) => {
                  const hidden = settings.hiddenTags.includes(key);
                  return (
                    <button key={key} data-testid={`cal-tag-visibility-${key}`}
                      onClick={() => toggleHidden(key)}
                      className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-bold transition-all",
                        hidden ? "border-border text-muted-foreground/50 line-through" : "hover:opacity-80")}
                      style={hidden ? undefined : { backgroundColor: m.color + "18", borderColor: m.color + "50", color: m.color }}>
                      {hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <button onClick={onManageTags}
                className="mt-2.5 text-[11px] font-bold text-primary hover:underline">
                Create, edit or delete tags…
              </button>
            </div>
            <Row label="Default import tag" hint="Pre-selected when importing an .ics file"
              control={
                <select data-testid="cal-default-import-tag" value={settings.defaultImportTag}
                  onChange={e => onChange({ defaultImportTag: e.target.value })}
                  className="text-xs bg-muted/40 border border-border rounded-lg px-2 py-1.5 outline-none max-w-[140px]">
                  {Object.entries(allTypes).map(([key, m]) => (
                    <option key={key} value={key}>{m.label}</option>
                  ))}
                </select>
              } />
          </Section>

          <button data-testid="cal-reset-settings"
            onClick={() => onChange({ ...DEFAULT_CALENDAR_SETTINGS })}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground py-2 transition-colors">
            <RotateCcw className="w-3 h-3" /> Reset to defaults
          </button>
        </div>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

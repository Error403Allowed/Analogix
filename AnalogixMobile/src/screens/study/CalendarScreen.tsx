import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, useWindowDimensions } from "react-native";
import { Text, useTheme, FAB, Portal, Modal, Button, TextInput, SegmentedButtons, ActivityIndicator, Searchbar } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { EVENTS, CREATE_EVENT, ADD_DEADLINE, DELETE_DEADLINE, IMPORT_ICS, UPDATE_DEADLINE } from "../../graphql/queries/calendar";
import { ME } from "../../graphql/queries/user";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import { ExpressiveEmptyState, ExpressiveScreen } from "../../components/expressive";
import { getTermInfo, AustralianState } from "../../utils/termData";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

type CalendarView = "month" | "week" | "day" | "schedule";

const HOUR_H = 52;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BUILTIN_EVENT_TYPES = ["exam", "assignment", "event", "class", "lesson", "reminder", "sport", "meeting", "personal"];
const PRIORITIES = ["low", "medium", "high"];
const CUSTOM_TYPES_KEY = "calendarCustomEventTypes";

const BUILTIN_COLORS: Record<string, string> = {
  exam: "#ef4444", assignment: "#f59e0b", event: "#3b82f6",
  class: "#10b981", lesson: "#10b981", reminder: "#8b5cf6",
  sport: "#f97316", meeting: "#06b6d4", personal: "#ec4899",
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const da = d.getDate();
  return `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEventColor(type: string, customTypes: { id: string; color: string }[]): string {
  if (BUILTIN_COLORS[type]) return BUILTIN_COLORS[type];
  const custom = customTypes.find(ct => ct.id === type);
  return custom?.color ?? "#6366f1";
}

function layoutEvents(events: any[], day: Date): any[] {
  const dayKey = toDateStr(day);
  const dayEvents = events.filter((e: any) => toDateStr(new Date(e.date)) === dayKey);
  if (dayEvents.length === 0) return [];

  const withMin = dayEvents.map((e: any) => {
    const d = new Date(e.date);
    const startMin = d.getHours() * 60 + d.getMinutes();
    let endMin = startMin + 60;
    if (e.endDate) {
      const ed = new Date(e.endDate);
      endMin = ed.getHours() * 60 + ed.getMinutes();
    }
    return { ...e, startMin, endMin };
  });

  const sorted = [...withMin].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const groups: any[][] = [];
  for (const item of sorted) {
    let placed = false;
    for (const group of groups) {
      if (group.some((g) => item.startMin < g.endMin && item.endMin > g.startMin)) {
        group.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([item]);
  }

  const result: any[] = [];
  for (const group of groups) {
    const cols: any[][] = [];
    for (const item of group) {
      let colIdx = cols.findIndex((col) => {
        const last = col[col.length - 1];
        return last.endMin <= item.startMin;
      });
      if (colIdx === -1) { colIdx = cols.length; cols.push([]); }
      cols[colIdx].push(item);
    }
    for (let c = 0; c < cols.length; c++) {
      for (const item of cols[c]) {
        let span = 1;
        for (let nc = c + 1; nc < cols.length; nc++) {
          if (cols[nc].some((cand) => item.startMin < cand.endMin && item.endMin > cand.startMin)) break;
          span += 1;
        }
        result.push({ ...item, top: (item.startMin / 60) * HOUR_H, height: Math.max(((item.endMin - item.startMin) / 60) * HOUR_H, 20), col: c, totalCols: cols.length, span });
      }
    }
  }
  return result;
}

export default function CalendarScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const c = paperTheme.colors as any;
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();

  const [view, setView] = useState<CalendarView>("month");
  const [focusDate, setFocusDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<"event" | "deadline">("event");
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(toDateStr(new Date()));
  const [newType, setNewType] = useState("event");
  const [newPriority, setNewPriority] = useState("medium");
  const [newSubject, setNewSubject] = useState("");

  const [customTypes, setCustomTypes] = useState<{ id: string; name: string; color: string }[]>([]);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#6366f1");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_TYPES_KEY).then((v) => {
      if (!v) return;
      try {
        setCustomTypes(JSON.parse(v));
      } catch (err) {
        console.warn("Failed to parse custom calendar tags:", err);
      }
    });
  }, []);

  const allEventTypes = useMemo(() => [...BUILTIN_EVENT_TYPES, ...customTypes.map(ct => ct.id)], [customTypes]);

  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(now), [now]);
  const from = new Date(now.getFullYear() - 1, 0, 1);
  const to = new Date(now.getFullYear() + 1, 11, 31);

  const { data, loading, error, refetch } = useQuery(EVENTS, {
    variables: { from: from.toISOString(), to: to.toISOString() },
  });
  const { data: userData } = useQuery(ME);
  const [createEvent] = useMutation(CREATE_EVENT);
  const [addDeadline] = useMutation(ADD_DEADLINE);
  const [deleteDeadline] = useMutation(DELETE_DEADLINE);
  const [updateDeadline] = useMutation(UPDATE_DEADLINE);
  const [importIcs] = useMutation(IMPORT_ICS);

  const events = useMemo(() => data?.events ?? [], [data]);
  const deadlines = useMemo(() => data?.deadlines ?? [], [data]);
  const userState = userData?.me?.state as AustralianState | undefined;
  const todayEventCount = useMemo(() =>
    events.filter((e: any) => toDateStr(new Date(e.date)) === todayStr).length,
    [events, todayStr]
  );
  const totalItemCount = events.length + deadlines.length;
  const weekColumnWidth = Math.max(86, Math.min(118, Math.floor((width - 56) / 3.15)));
  const dayColumnWidth = Math.max(width - 56, 280);

  const termInfo = useMemo(() => {
    if (!userState) return null;
    return getTermInfo(focusDate, userState);
  }, [focusDate, userState]);

  const saveCustomType = useCallback(async () => {
    if (!newTypeName.trim()) return;
    const t = { id: newTypeName.trim().toLowerCase().replace(/\s+/g, "-"), name: newTypeName.trim(), color: newTypeColor };
    const updated = [...customTypes, t];
    setCustomTypes(updated);
    await AsyncStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify(updated));
    setNewTypeName("");
    setShowTypeManager(false);
  }, [newTypeName, newTypeColor, customTypes]);

  const deleteCustomType = useCallback(async (typeId: string) => {
    const updated = customTypes.filter(ct => ct.id !== typeId);
    setCustomTypes(updated);
    await AsyncStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify(updated));
  }, [customTypes]);

  // ─── Month helpers ──────────────────────────────────────────────────────
  const year = focusDate.getFullYear();
  const m = focusDate.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const startDay = new Date(year, m, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dayEvents = useCallback((d: number) =>
    events.filter((e: any) => {
      const date = new Date(e.date);
      return date.getDate() === d && date.getMonth() === m && date.getFullYear() === year;
    }), [events, m, year]);

  const dayDeadlines = useCallback((d: number) =>
    deadlines.filter((dl: any) => {
      const date = new Date(dl.dueDate);
      return date.getDate() === d && date.getMonth() === m && date.getFullYear() === year;
    }), [deadlines, m, year]);

  // ─── Week helpers ───────────────────────────────────────────────────────
  const weekStart = useMemo(() => startOfWeek(focusDate), [focusDate]);
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }), [weekStart]);

  const isToday = (d: Date) =>
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

  const todayTop = useMemo(() => {
    const min = now.getHours() * 60 + now.getMinutes();
    return (min / 60) * HOUR_H;
  }, [now]);

  // ─── Navigation ─────────────────────────────────────────────────────────
  const prev = () => {
    if (view === "month") setFocusDate(new Date(year, m - 1, 1));
    else if (view === "week") setFocusDate(new Date(focusDate.getTime() - 7 * 86400000));
    else if (view === "day") setFocusDate(new Date(focusDate.getTime() - 86400000));
    else if (view === "schedule") setFocusDate(new Date(focusDate.getTime() - 14 * 86400000));
  };
  const next = () => {
    if (view === "month") setFocusDate(new Date(year, m + 1, 1));
    else if (view === "week") setFocusDate(new Date(focusDate.getTime() + 7 * 86400000));
    else if (view === "day") setFocusDate(new Date(focusDate.getTime() + 86400000));
    else if (view === "schedule") setFocusDate(new Date(focusDate.getTime() + 14 * 86400000));
  };
  const goToday = () => setFocusDate(new Date());

  const viewTitle = useMemo(() => {
    if (view === "month") return focusDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (view === "week") {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} \u2013 ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (view === "day") return focusDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return "Upcoming";
  }, [view, focusDate, weekStart]);

  const openCreate = (date?: string, mode: "event" | "deadline" = "event") => {
    if (date) setNewDate(date);
    setCreateMode(mode);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      if (createMode === "deadline") {
        await addDeadline({ variables: { input: { title: newTitle.trim(), dueDate: newDate, priority: newPriority, subject: newSubject.trim() || undefined } }, refetchQueries: ["Events"] });
      } else {
        await createEvent({ variables: { input: { title: newTitle.trim(), date: newDate, type: newType } }, refetchQueries: ["Events"] });
      }
      setShowCreate(false);
      setNewTitle("");
      setNewSubject("");
    } catch (err) {
      console.error("Failed to create:", err);
    }
  };

  const handleImportICS = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "text/calendar", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const icsContent = await readAsStringAsync(result.assets[0].uri);
      await importIcs({ variables: { ics: icsContent } });
      Alert.alert("Imported", "Calendar events imported successfully.");
      refetch();
    } catch (err: any) {
      Alert.alert("Import Error", err.message || "Failed to import ICS file.");
    }
  }, [importIcs, refetch]);

  const scheduleDays = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of events) {
      const key = toDateStr(new Date(e.date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ...e, _type: "event" });
    }
    for (const d of deadlines) {
      const key = toDateStr(new Date(d.dueDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ...d, _type: "deadline", title: d.title, date: d.dueDate });
    }
    const query = searchQuery.trim().toLowerCase();
    if (query || activeFilters.length > 0) {
      for (const [key, items] of map) {
        const filtered = items.filter((item: any) => {
          const matchesSearch = !query || item.title?.toLowerCase().includes(query);
          const matchesFilter = activeFilters.length === 0 || activeFilters.includes(item.type);
          return matchesSearch && matchesFilter;
        });
        if (filtered.length === 0) map.delete(key);
        else map.set(key, filtered);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 30);
  }, [events, deadlines, searchQuery, activeFilters]);

  const handleDeadlineAction = (dl: any) => {
    Alert.alert(dl.title, `${new Date(dl.dueDate).toLocaleDateString("en-AU")} \u00b7 ${dl.priority} priority`, [
      { text: "Edit", onPress: () => {
        Alert.prompt?.("Edit Deadline", "New title:", [
          { text: "Cancel", style: "cancel" },
          { text: "Save", onPress: (val?: string) => {
            if (val?.trim()) {
              updateDeadline({ variables: { id: dl.id, input: { title: val.trim() } }, refetchQueries: ["Events"] });
            }
          }},
        ], "plain-text", dl.title);
      }},
      { text: "Delete", style: "destructive", onPress: () => deleteDeadline({ variables: { id: dl.id }, refetchQueries: ["Events"] }) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleEventPress = (event: any) => {
    navigation.navigate("EventDetail", { eventId: event.id });
  };

  // ─── Headers + controls ─────────────────────────────────────────────────
  const viewControls = (
    <View>
      <SegmentedButtons
        value={view}
        onValueChange={(v) => setView(v as CalendarView)}
        buttons={[
          { value: "month", label: "Month" },
          { value: "week", label: "Week" },
          { value: "day", label: "Day" },
          { value: "schedule", label: "List" },
        ]}
        density="small"
      />
      <View style={styles.navRow}>
        <Pressable onPress={prev} style={styles.navBtn}>
          <Icon name="chevron-left" size={20} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
        <Text variant="titleSmall" numberOfLines={1} style={{ flex: 1, textAlign: "center", fontWeight: "700", color: paperTheme.colors.onSurface }}>{viewTitle}</Text>
        <Pressable onPress={next} style={styles.navBtn}>
          <Icon name="chevron-right" size={20} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
      </View>
      {termInfo && (
        <View style={styles.termRow}>
          <View style={styles.termBar}>
            <View style={[styles.termFill, { width: `${termInfo.progress}%`, backgroundColor: brand.primary }]} />
          </View>
          <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, flexShrink: 0, textAlign: "right" }}>
            {termInfo.term.label} {termInfo.week}/{termInfo.totalWeeks} wks
          </Text>
        </View>
      )}
    </View>
  );

  // ─── Month view ─────────────────────────────────────────────────────────
  const monthGrid = (
    <>
      <View style={styles.weekdayRow}>
        {WEEKDAYS_SHORT.map((d) => (
          <Text key={d} variant="labelSmall" style={styles.weekdayLabel}>{d}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {Array.from({ length: startDay }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.dayCell} />
        ))}
        {days.map((d) => {
          const dayE = dayEvents(d);
          const dayDl = dayDeadlines(d);
          const hasItems = dayE.length + dayDl.length > 0;
          const dateObj = new Date(year, m, d);
          const today = isToday(dateObj);
          return (
            <Pressable
              key={d}
              style={[
                styles.dayCell,
                hasItems && { backgroundColor: brand.primary + "08" },
              ]}
              onPress={() => { setFocusDate(dateObj); setView("day"); }}
              accessibilityRole="button"
              accessibilityLabel={`${dateObj.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}, ${dayE.length} events, ${dayDl.length} deadlines`}
            >
              <View style={[styles.dayNum, today && { backgroundColor: brand.primary, transform: [{ scale: 1.15 }] }]}>
                <Text style={{ fontWeight: today ? "800" : dayE.length > 0 ? "700" : "400", fontSize: 12, color: today ? "#fff" : paperTheme.colors.onSurface }}>{d}</Text>
              </View>
              {hasItems && (
                <View style={styles.dayEventRow}>
                  {dayE.slice(0, 2).map((e: any) => (
                    <View key={e.id} style={[styles.dayEventDot, { backgroundColor: getEventColor(e.type, customTypes) }]} />
                  ))}
                  {dayDl.slice(0, Math.max(0, 2 - dayE.slice(0, 2).length)).map((dl: any) => (
                    <View key={dl.id} style={[styles.deadlineDot, { backgroundColor: dl.priority === "high" ? "#ef4444" : dl.priority === "low" ? "#10b981" : "#f59e0b" }]} />
                  ))}
                  {dayE.length + dayDl.length > 2 && (
                    <Text variant="labelSmall" style={{ fontSize: 9, color: paperTheme.colors.onSurfaceVariant, marginTop: 1 }}>
                      +{dayE.length + dayDl.length - 2}
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </>
  );

  // ─── Week/Day time grid ─────────────────────────────────────────────────
  const timeGrid = (isWeek: boolean) => {
    const days = isWeek ? weekDays : [focusDate];
    return (
      <View style={styles.timeGridContainer}>
        <ScrollView horizontal={isWeek} showsHorizontalScrollIndicator={false}>
          <View>
            {isWeek && (
              <View style={styles.weekHeader}>
                <View style={{ width: 40 }} />
                {weekDays.map((d, i) => (
                  <View key={i} style={[styles.weekDayCol, { width: weekColumnWidth }]}>
                    <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{WEEKDAYS_SHORT[d.getDay()]}</Text>
                    <View style={[styles.weekDayNum, isToday(d) && { backgroundColor: brand.primary }]}>
                      <Text style={{ fontWeight: "700", fontSize: 13, color: isToday(d) ? "#fff" : paperTheme.colors.onSurface }}>{d.getDate()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <View style={{ flexDirection: "row" }}>
              <View style={{ width: 40 }}>
                {HOURS.map((h) => (
                  <View key={h} style={[styles.hourLabel, { borderTopColor: c.outlineVariant }]}>
                    <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{h === 0 ? "" : `${h}`}</Text>
                  </View>
                ))}
              </View>
              {days.map((d, di) => {
                const laid = layoutEvents(events, d);
                return (
                  <View key={di} style={isWeek ? [styles.dayCol, { width: weekColumnWidth }] : { width: dayColumnWidth, position: "relative" }}>
                    {HOURS.map((h) => (
                      <Pressable key={h} style={[styles.hourSlot, { borderTopColor: c.outlineVariant }]}
                        onPress={() => {
                          setNewDate(`${toDateStr(d)}T${String(h).padStart(2, "0")}:00`);
                          setCreateMode("event");
                          setShowCreate(true);
                        }}
                      />
                    ))}
                    {laid.map((item) => {
                      const color = getEventColor(item.type, customTypes);
                      return (
                        <Pressable key={item.id} onPress={() => handleEventPress(item)}
                          style={[styles.timeBlock, { top: item.top, height: item.height, width: `${(item.span / item.totalCols) * 100}%` as any, left: `${(item.col / item.totalCols) * 100}%` as any, backgroundColor: color + "18", borderLeftColor: color }]}>
                          <Text style={[styles.timeBlockTitle, { color }]} numberOfLines={1}>{item.title}</Text>
                          <Text style={[styles.timeBlockTime, { color: color + "cc" }]}>
                            {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {isToday(d) && (
                      <View style={[styles.nowLine, { top: todayTop, backgroundColor: brand.primary }]}>
                        <View style={[styles.nowDot, { backgroundColor: brand.primary }]} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  // ─── Schedule/list view ─────────────────────────────────────────────────
  const scheduleView = (
    <View style={{ paddingHorizontal: 16, paddingBottom: 100 }}>
      <Searchbar
        placeholder="Search events..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={{ marginBottom: 8, borderRadius: 16 }}
        inputStyle={{ fontSize: 14 }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {allEventTypes.slice(0, 8).map((t) => {
            const color = getEventColor(t, customTypes);
            const active = activeFilters.includes(t);
            return (
              <Pressable key={t} onPress={() => setActiveFilters(prev => prev.includes(t) ? prev.filter(f => f !== t) : [...prev, t])}
                style={[styles.filterChip, { backgroundColor: active ? color : paperTheme.colors.surfaceVariant }]}>
                <Text style={{ color: active ? "#fff" : paperTheme.colors.onSurface, fontWeight: "600", fontSize: 11 }}>
                  {customTypes.find(ct => ct.id === t)?.name ?? t}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {scheduleDays.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", paddingVertical: 40 }}>
          No upcoming events
        </Text>
      ) : scheduleDays.map(([dateStr, items]) => (
        <View key={dateStr} style={{ marginBottom: 16 }}>
          <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 8 }}>
            {new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </Text>
          {items.map((item: any, i: number) => {
            const color = getEventColor(item.type ?? "event", customTypes);
            return (
              <Pressable key={item.id ?? i}
                style={[styles.scheduleItem, { backgroundColor: c.surfaceContainerLow ?? paperTheme.colors.surfaceVariant }]}
                onPress={() => item._type === "deadline" ? handleDeadlineAction(item) : handleEventPress(item)}>
                <View style={[styles.scheduleDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{item.title}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                    {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {item.subject ? ` \u00b7 ${item.subject}` : ""}
                  </Text>
                </View>
                <Text variant="labelSmall" style={{ color }}>{item.type ?? (item._type === "deadline" ? "deadline" : "")}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <ExpressiveScreen
      title="Calendar"
      subtitle={`${todayEventCount} event${todayEventCount !== 1 ? "s" : ""} today`}
      onBack={() => navigation.goBack()}
      scroll={false}
      contentStyle={{ padding: 0, gap: 0 }}
      actions={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Pressable onPress={goToday} style={styles.todayBtn}>
            <Text variant="labelSmall" style={{ color: brand.primary, fontWeight: "600" }}>Today</Text>
          </Pressable>
          <Pressable onPress={handleImportICS} style={styles.iconBtn}>
            <Icon name="file-upload" size={18} color={paperTheme.colors.onSurfaceVariant} />
          </Pressable>
        </View>
      }
      fab={
        <FAB icon="plus" color="#fff" style={{ backgroundColor: brand.primary, borderRadius: SHAPE.lg }} onPress={() => openCreate(toDateStr(focusDate), "event")} />
      }
    >
      {viewControls}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={brand.primary} />
            <Text style={{ color: paperTheme.colors.onSurfaceVariant }}>Loading calendar...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <ExpressiveEmptyState icon="calendar-alert" title="Could not load calendar" subtitle="Check your connection and try again." />
            <Button mode="contained" buttonColor={brand.primary} onPress={() => refetch()} style={{ borderRadius: SHAPE.lg }}>
              Retry
            </Button>
          </View>
        ) : totalItemCount === 0 ? (
          <View style={styles.centerState}>
            <ExpressiveEmptyState icon="calendar-blank" title="Nothing scheduled" subtitle="Add an event or import a calendar to start planning." />
            <Button mode="contained" buttonColor={brand.primary} onPress={() => openCreate(toDateStr(focusDate), "event")} style={{ borderRadius: SHAPE.lg }}>
              Add event
            </Button>
          </View>
        ) : (
          <>
            {view === "month" && monthGrid}
            {view === "week" && timeGrid(true)}
            {view === "day" && timeGrid(false)}
            {view === "schedule" && scheduleView}
          </>
        )}
      </ScrollView>

      <Portal>
        <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} contentContainerStyle={[styles.modal, { backgroundColor: c.surface ?? paperTheme.colors.surface }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 16 }}>
              New {createMode === "deadline" ? "deadline" : "event"}
            </Text>
            <SegmentedButtons
              value={createMode}
              onValueChange={(v) => setCreateMode(v as "event" | "deadline")}
              buttons={[{ value: "event", label: "Event" }, { value: "deadline", label: "Deadline" }]}
              style={{ marginBottom: 12 }}
            />
            <TextInput mode="outlined" label="Title" value={newTitle} onChangeText={setNewTitle} style={{ marginBottom: 12 }} />
            <TextInput mode="outlined" label={createMode === "deadline" ? "Due date" : "Date"} value={newDate} onChangeText={setNewDate} style={{ marginBottom: 12 }} />
            {createMode === "event" ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Type</Text>
                  <Pressable onPress={() => setShowTypeManager(true)}>
                    <Text variant="labelSmall" style={{ color: brand.primary }}>Manage tags</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {allEventTypes.map((t) => {
                    const color = getEventColor(t, customTypes);
                    const isCustom = !BUILTIN_EVENT_TYPES.includes(t);
                    return (
                      <Pressable key={t} onPress={() => setNewType(t)}
                        style={[styles.typeChip, { backgroundColor: newType === t ? color : paperTheme.colors.surfaceVariant }]}>
                        <Text style={{ color: newType === t ? "#fff" : paperTheme.colors.onSurface, fontWeight: "700", fontSize: 12 }}>
                          {customTypes.find(ct => ct.id === t)?.name ?? t}
                        </Text>
                        {isCustom && (
                          <Pressable onPress={() => deleteCustomType(t)} style={{ marginLeft: 4 }}>
                            <Icon name="close" size={12} color={newType === t ? "#fff" : paperTheme.colors.onSurfaceVariant} />
                          </Pressable>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>Priority</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {PRIORITIES.map((p) => (
                    <Pressable key={p} onPress={() => setNewPriority(p)}
                      style={[styles.typeChip, { backgroundColor: newPriority === p ? brand.primary : paperTheme.colors.surfaceVariant }]}>
                      <Text style={{ color: newPriority === p ? "#fff" : paperTheme.colors.onSurface, fontWeight: "700", fontSize: 12 }}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput mode="outlined" label="Subject (optional)" value={newSubject} onChangeText={setNewSubject} style={{ marginBottom: 16 }} />
              </>
            )}
            <Button mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg }} onPress={handleCreate} disabled={!newTitle.trim()}>
              Create
            </Button>
          </ScrollView>
        </Modal>

        <Modal visible={showTypeManager} onDismiss={() => setShowTypeManager(false)} contentContainerStyle={[styles.modal, { backgroundColor: c.surface ?? paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 16 }}>Manage Event Tags</Text>
          <TextInput mode="outlined" label="New tag name" value={newTypeName} onChangeText={setNewTypeName} style={{ marginBottom: 12 }} />
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>Colour</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#6366f1"].map((col) => (
              <Pressable key={col} onPress={() => setNewTypeColor(col)} style={[styles.colorDot, { backgroundColor: col, borderWidth: newTypeColor === col ? 3 : 0, borderColor: paperTheme.colors.onSurface }]} />
            ))}
          </View>
          <Button mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg }} onPress={saveCustomType} disabled={!newTypeName.trim()}>
            Add Tag
          </Button>
          {customTypes.length > 0 && (
            <>
              <View style={{ height: 1, backgroundColor: c.outlineVariant, marginVertical: 16 }} />
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>Custom tags</Text>
              {customTypes.map((ct) => (
                <View key={ct.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
                  <View style={[styles.colorDot, { backgroundColor: ct.color }]} />
                  <Text variant="bodyMedium" style={{ flex: 1 }}>{ct.name}</Text>
                  <Pressable onPress={() => deleteCustomType(ct.id)}>
                    <Icon name="delete-outline" size={18} color={paperTheme.colors.error} />
                  </Pressable>
                </View>
              ))}
            </>
          )}
        </Modal>
      </Portal>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  todayBtn: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 8, justifyContent: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  // Controls below header
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
  navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  termRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  termBar: { flex: 1, height: 4, backgroundColor: "rgba(128,128,128,0.15)", borderRadius: 2 },
  termFill: { height: 4, borderRadius: 2 },

  // Month
  weekdayRow: { flexDirection: "row", marginHorizontal: 4, marginTop: 8, marginBottom: 2 },
  weekdayLabel: { flex: 1, textAlign: "center", color: "rgba(128,128,128,0.5)", fontWeight: "700", fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 4 },
  dayCell: { width: "14.28%", aspectRatio: 1, padding: 2, alignItems: "center", justifyContent: "flex-start", paddingTop: 4 },
  dayNum: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 1 },
  dayEventRow: { flexDirection: "row", gap: 2, alignItems: "center", justifyContent: "center", flexWrap: "wrap", minHeight: 8, marginTop: 1 },
  dayEventDot: { width: 5, height: 5, borderRadius: 2.5 },
  deadlineDot: { width: 5, height: 5, borderRadius: 2.5, borderWidth: 1, borderColor: "#fff" },

  // Week/day
  timeGridContainer: { paddingBottom: 100, paddingTop: 4 },
  weekHeader: { flexDirection: "row", marginLeft: 40 },
  weekDayCol: { width: 100, alignItems: "center", paddingVertical: 4 },
  weekDayNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dayCol: { width: 100, position: "relative" },
  hourLabel: { height: HOUR_H, justifyContent: "flex-start", alignItems: "flex-end", paddingRight: 4, borderTopWidth: StyleSheet.hairlineWidth },
  hourSlot: { height: HOUR_H, borderTopWidth: StyleSheet.hairlineWidth, minWidth: 86 },
  timeBlock: {
    position: "absolute", borderRadius: 4, borderLeftWidth: 3,
    paddingHorizontal: 4, paddingVertical: 2, overflow: "hidden",
  },
  timeBlockTitle: { fontSize: 11, fontWeight: "600" },
  timeBlockTime: { fontSize: 9 },
  nowLine: { position: "absolute", left: 0, right: 0, height: 2, zIndex: 10 },
  nowDot: { width: 8, height: 8, borderRadius: 4, position: "absolute", left: -4, top: -3 },

  // Schedule
  scheduleItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, marginBottom: 8 },
  scheduleDot: { width: 8, height: 8, borderRadius: 4 },

  // Shared
  centerState: { minHeight: 360, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl, maxHeight: "86%" },
  typeChip: { borderRadius: SHAPE.pill, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center" },
  filterChip: { borderRadius: SHAPE.pill, paddingHorizontal: 10, paddingVertical: 5 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
});

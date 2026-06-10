import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Dimensions } from "react-native";
import { Text, useTheme, Card, FAB, Portal, Modal, Button, TextInput, SegmentedButtons, ActivityIndicator, Searchbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { EVENTS, CREATE_EVENT, ADD_DEADLINE, DELETE_DEADLINE, IMPORT_ICS, UPDATE_DEADLINE } from "../../graphql/queries/calendar";
import { ME } from "../../graphql/queries/user";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import { getTermInfo, AustralianState } from "../../utils/termData";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

type CalendarView = "month" | "week" | "day" | "schedule";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HOUR_H = 52;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BUILTIN_EVENT_TYPES = ["exam", "assignment", "event", "class", "lesson", "reminder", "sport", "meeting", "personal"];
const PRIORITIES = ["low", "medium", "high"];
const CUSTOM_TYPES_KEY = "calendarCustomEventTypes";
const FILTER_KEY = "calendarEventFilter";

const BUILTIN_COLORS: Record<string, string> = {
  exam: "#ef4444", assignment: "#f59e0b", event: "#3b82f6",
  class: "#10b981", lesson: "#10b981", reminder: "#8b5cf6",
  sport: "#f97316", meeting: "#06b6d4", personal: "#ec4899",
};

function getTypeMeta(type: string) {
  const color = BUILTIN_COLORS[type] ?? "#6366f1";
  return { color };
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

// ─── Overlap layout ───────────────────────────────────────────────────────
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
      if (colIdx === -1) {
        colIdx = cols.length;
        cols.push([]);
      }
      cols[colIdx].push(item);
    }

    for (let c = 0; c < cols.length; c++) {
      for (const item of cols[c]) {
        let span = 1;
        for (let nc = c + 1; nc < cols.length; nc++) {
          const blocked = cols[nc].some(
            (cand) => item.startMin < cand.endMin && item.endMin > cand.startMin
          );
          if (blocked) break;
          span += 1;
        }
        const top = (item.startMin / 60) * HOUR_H;
        const height = Math.max(((item.endMin - item.startMin) / 60) * HOUR_H, 20);
        result.push({ ...item, top, height, col: c, totalCols: cols.length, span });
      }
    }
  }
  return result;
}

// ─── EventChip ────────────────────────────────────────────────────────────
function EventChip({ event, compact, onPress }: { event: any; compact?: boolean; onPress?: () => void }) {
  const meta = getTypeMeta(event.type);
  return (
    <Pressable onPress={onPress} style={[styles.eventChip, { backgroundColor: meta.color + "18", borderLeftColor: meta.color }]}>
      <View style={[styles.eventChipDot, { backgroundColor: meta.color }]} />
      {!compact && <Text style={[styles.eventChipTime, { color: meta.color }]}>
        {new Date(event.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>}
      <Text style={[styles.eventChipTitle, { color: meta.color }]} numberOfLines={1}>{event.title}</Text>
    </Pressable>
  );
}

// ─── TimeBlock (for week/day views) ───────────────────────────────────────
function TimeBlock({ event, col, totalCols, span, onPress }: any) {
  const meta = getTypeMeta(event.type);
  const width = `${(span / totalCols) * 100}%`;
  const left = `${(col / totalCols) * 100}%`;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.timeBlock,
        {
          top: event.top,
          height: event.height,
          width: width as any,
          left: left as any,
          backgroundColor: meta.color + "18",
          borderLeftColor: meta.color,
        },
      ]}
    >
      <Text style={[styles.timeBlockTitle, { color: meta.color }]} numberOfLines={1}>{event.title}</Text>
      <Text style={[styles.timeBlockTime, { color: meta.color + "cc" }]}>
        {new Date(event.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>
    </Pressable>
  );
}

export default function CalendarScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const c = paperTheme.colors as any;
  const insets = useSafeAreaInsets();
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

  // Custom event types
  const [customTypes, setCustomTypes] = useState<{ id: string; name: string; color: string }[]>([]);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#6366f1");

  // Event search/filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_TYPES_KEY).then((v) => {
      if (v) try { setCustomTypes(JSON.parse(v)); } catch { /* noop */ }
    });
  }, []);

  const allEventTypes = useMemo(() => {
    return [...BUILTIN_EVENT_TYPES, ...customTypes.map(ct => ct.id)];
  }, [customTypes]);

  const getTypeColor = useCallback((type: string): string => {
    if (BUILTIN_COLORS[type]) return BUILTIN_COLORS[type];
    const custom = customTypes.find(ct => ct.id === type);
    return custom?.color ?? "#6366f1";
  }, [customTypes]);

  const saveCustomType = useCallback(async () => {
    if (!newTypeName.trim()) return;
    const newType = { id: newTypeName.trim().toLowerCase().replace(/\s+/g, "-"), name: newTypeName.trim(), color: newTypeColor };
    const updated = [...customTypes, newType];
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

  const toggleFilter = useCallback((type: string) => {
    setActiveFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  }, []);

  const now = useMemo(() => new Date(), []);
  const from = new Date(now.getFullYear() - 1, 0, 1);
  const to = new Date(now.getFullYear() + 1, 11, 31);

  const { data, refetch } = useQuery(EVENTS, {
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

  const termInfo = useMemo(() => {
    if (!userState) return null;
    return getTermInfo(focusDate, userState);
  }, [focusDate, userState]);

  // ─── Month view helpers ──────────────────────────────────────────────────
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

  // ─── Week view helpers ───────────────────────────────────────────────────
  const weekStart = useMemo(() => startOfWeek(focusDate), [focusDate]);
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }), [weekStart]);

  const isToday = (d: Date) =>
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

  const todayTop = useMemo(() => {
    const min = now.getHours() * 60 + now.getMinutes();
    return (min / 60) * HOUR_H;
  }, [now]);

  // ─── Navigation ──────────────────────────────────────────────────────────
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
      return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (view === "day") return focusDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return "Upcoming";
  }, [view, focusDate, weekStart]);

  // ─── Create ──────────────────────────────────────────────────────────────
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

  // ─── ICS Import ──────────────────────────────────────────────────────────
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

  // ─── Schedule view grouping ──────────────────────────────────────────────
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

    // Apply search filter
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

    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.slice(0, 30);
  }, [events, deadlines, searchQuery, activeFilters]);

  // ─── Deadline edit ───────────────────────────────────────────────────────
  const handleDeadlineAction = (dl: any) => {
    Alert.alert(dl.title, `${new Date(dl.dueDate).toLocaleDateString("en-AU")} · ${dl.priority} priority`, [
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
      { text: "Delete", style: "destructive", onPress: () =>
        deleteDeadline({ variables: { id: dl.id }, refetchQueries: ["Events"] })
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleEventPress = (event: any) => {
    navigation.navigate("EventDetail", { eventId: event.id });
  };

  return (
    <View style={[styles.container, { backgroundColor: c.surface ?? paperTheme.colors.background }]}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: c.surfaceContainer ?? paperTheme.colors.surface }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
        <Text variant="titleMedium" style={{ fontWeight: "700", flex: 1, color: paperTheme.colors.onSurface }}>
          Calendar
        </Text>
        <Pressable onPress={goToday} style={styles.todayBtn}>
          <Text variant="labelSmall" style={{ color: brand.primary, fontWeight: "600" }}>Today</Text>
        </Pressable>
        <Pressable onPress={handleImportICS} style={styles.todayBtn}>
          <Icon name="file-upload" size={18} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {/* ── View switcher ────────────────────────────────────────────────── */}
      <View style={styles.viewSwitcher}>
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
      </View>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <View style={styles.navRow}>
        <Pressable onPress={prev} style={styles.navBtn}>
          <Icon name="chevron-left" size={20} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
        <Text variant="titleSmall" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{viewTitle}</Text>
        <Pressable onPress={next} style={styles.navBtn}>
          <Icon name="chevron-right" size={20} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {/* ── Term badge ───────────────────────────────────────────────────── */}
      {termInfo && (
        <View style={styles.termRow}>
          <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
            {termInfo.term.label} · Week {termInfo.week}/{termInfo.totalWeeks}
          </Text>
          <View style={styles.termBar}>
            <View style={[styles.termFill, { width: `${termInfo.progress}%`, backgroundColor: brand.primary }]} />
          </View>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* ── MONTH VIEW ─────────────────────────────────────────────────── */}
        {view === "month" && (
          <>
            <View style={styles.weekdays}>
              {WEEKDAYS.map((d) => (
                <Text key={d} variant="labelSmall" style={{ flex: 1, textAlign: "center", color: paperTheme.colors.onSurfaceVariant }}>{d}</Text>
              ))}
            </View>
            <View style={styles.grid}>
              {Array.from({ length: startDay }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCell} />
              ))}
              {days.map((d) => {
                const dayE = dayEvents(d);
                const dayDl = dayDeadlines(d);
                const hasItems = dayE.length > 0 || dayDl.length > 0;
                const dateObj = new Date(year, m, d);
                const dtStr = toDateStr(dateObj);
                return (
                  <Pressable key={d} style={styles.dayCell} onPress={() => { setFocusDate(dateObj); setView("day"); }}>
                    <View style={[styles.dayNum, isToday(dateObj) && { backgroundColor: brand.primary }]}>
                      <Text style={{ fontWeight: hasItems ? "700" : "400", fontSize: 13, color: isToday(dateObj) ? "#fff" : paperTheme.colors.onSurface }}>{d}</Text>
                    </View>
                    {hasItems && <View style={[styles.dayDot, { backgroundColor: dayE.length > 0 ? brand.primary : paperTheme.colors.error }]} />}
                    {dayE.slice(0, 2).map((e: any) => (
                      <EventChip key={e.id} event={e} compact onPress={() => handleEventPress(e)} />
                    ))}
                    {dayE.length > 2 && (
                      <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>+{dayE.length - 2} more</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ── WEEK VIEW ──────────────────────────────────────────────────── */}
        {view === "week" && (
          <View style={styles.timeGridContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Day headers */}
                <View style={styles.weekHeader}>
                  <View style={{ width: 40 }} />
                  {weekDays.map((d, i) => (
                    <View key={i} style={styles.weekDayCol}>
                      <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{WEEKDAYS[d.getDay()]}</Text>
                      <View style={[styles.weekDayNum, isToday(d) && { backgroundColor: brand.primary }]}>
                        <Text style={{ fontWeight: "700", fontSize: 13, color: isToday(d) ? "#fff" : paperTheme.colors.onSurface }}>{d.getDate()}</Text>
                      </View>
                    </View>
                  ))}
                </View>
                {/* Time grid */}
                <View style={{ flexDirection: "row" }}>
                  <View style={{ width: 40 }}>
                    {HOURS.map((h) => (
                      <View key={h} style={[styles.hourLabel, { borderTopColor: c.outlineVariant }]}>
                        <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                          {h === 0 ? "" : `${h}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {weekDays.map((d, di) => {
                    const laid = layoutEvents(events, d);
                    return (
                      <View key={di} style={styles.dayCol}>
                        {HOURS.map((h) => (
                          <Pressable key={h} style={[styles.hourSlot, { borderTopColor: c.outlineVariant }]}
                            onPress={() => {
                              const dateStr = toDateStr(d);
                              const timeStr = `${String(h).padStart(2, "0")}:00`;
                              setNewDate(`${dateStr}T${timeStr}`);
                              setCreateMode("event");
                              setShowCreate(true);
                            }}
                          />
                        ))}
                        {laid.map((item) => (
                          <TimeBlock key={item.id} event={item} col={item.col} totalCols={item.totalCols} span={item.span} onPress={() => handleEventPress(item)} />
                        ))}
                        {isToday(d) && (
                          <View style={[styles.nowLine, { top: todayTop, backgroundColor: brand.primary }]}>
                            <View style={[styles.nowDot, { backgroundColor: brand.primary }]} />
      {/* ── Type Manager Modal ─────────────────────────────────────────── */}
      <Portal>
        <Modal visible={showTypeManager} onDismiss={() => setShowTypeManager(false)} contentContainerStyle={[styles.modal, { backgroundColor: c.surface ?? paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 16 }}>
            Manage Event Tags
          </Text>
          <TextInput mode="outlined" label="New tag name" value={newTypeName} onChangeText={setNewTypeName} style={{ marginBottom: 12 }} />
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>Colour</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#6366f1"].map((col) => (
              <Pressable key={col} onPress={() => setNewTypeColor(col)}
                style={[styles.colorDot, { backgroundColor: col, borderWidth: newTypeColor === col ? 3 : 0 }]} />
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
    </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── DAY VIEW ───────────────────────────────────────────────────── */}
        {view === "day" && (
          <View style={styles.timeGridContainer}>
            <View style={{ flexDirection: "row" }}>
              <View style={{ width: 44 }}>
                {HOURS.map((h) => (
                  <View key={h} style={[styles.hourLabel, { borderTopColor: c.outlineVariant }]}>
                    <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                      {h === 0 ? "" : `${h}`}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                {HOURS.map((h) => (
                  <Pressable key={h} style={[styles.hourSlot, { borderTopColor: c.outlineVariant }]}
                    onPress={() => {
                      const dateStr = toDateStr(focusDate);
                      const timeStr = `${String(h).padStart(2, "0")}:00`;
                      setNewDate(`${dateStr}T${timeStr}`);
                      setCreateMode("event");
                      setShowCreate(true);
                    }}
                  />
                ))}
                {layoutEvents(events, focusDate).map((item) => (
                  <TimeBlock key={item.id} event={item} col={item.col} totalCols={item.totalCols} span={item.span} onPress={() => handleEventPress(item)} />
                ))}
                {isToday(focusDate) && (
                  <View style={[styles.nowLine, { top: todayTop, backgroundColor: brand.primary }]}>
                    <View style={[styles.nowDot, { backgroundColor: brand.primary }]} />
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── SCHEDULE VIEW ──────────────────────────────────────────────── */}
        {view === "schedule" && (
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
                  const color = getTypeColor(t);
                  const active = activeFilters.includes(t);
                  return (
                    <Pressable key={t} onPress={() => toggleFilter(t)}
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
                  const meta = getTypeMeta(item.type ?? "event");
                  return (
                    <Pressable
                      key={item.id ?? i}
                      style={[styles.scheduleItem, { backgroundColor: c.surfaceContainerLow ?? paperTheme.colors.surfaceVariant }]}
                      onPress={() => item._type === "deadline" ? handleDeadlineAction(item) : handleEventPress(item)}
                    >
                      <View style={[styles.scheduleDot, { backgroundColor: meta.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{item.title}</Text>
                        <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                          {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {item.subject ? ` · ${item.subject}` : ""}
                        </Text>
                      </View>
                      <Text variant="labelSmall" style={{ color: meta.color }}>
                        {item.type ?? (item._type === "deadline" ? "deadline" : "")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* ── FAB ────────────────────────────────────────────────────────── */}
      </ScrollView>

      <FAB icon="plus" color="#fff" style={[styles.fab, { backgroundColor: brand.primary }]} onPress={() => openCreate(toDateStr(focusDate), "event")} />

      {/* ── Create Modal ─────────────────────────────────────────────────── */}
      <Portal>
        <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} contentContainerStyle={[styles.modal, { backgroundColor: c.surface ?? paperTheme.colors.surface }]}>
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
                  const color = getTypeColor(t);
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
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  viewSwitcher: { paddingHorizontal: 12, marginVertical: 4 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 4 },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  termRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  termBar: { flex: 1, height: 4, backgroundColor: "rgba(128,128,128,0.15)", borderRadius: 2 },
  termFill: { height: 4, borderRadius: 2 },

  // Month
  weekdays: { flexDirection: "row", paddingHorizontal: 8, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 4 },
  dayCell: { width: "14.28%", minHeight: 56, padding: 1, alignItems: "center" },
  dayNum: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },

  // Event chip (compact in month)
  eventChip: {
    flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 3,
    paddingVertical: 1, borderRadius: 4, borderLeftWidth: 2, marginTop: 1, width: "100%",
  },
  eventChipDot: { width: 4, height: 4, borderRadius: 2 },
  eventChipTime: { fontSize: 8 },
  eventChipTitle: { fontSize: 9, flex: 1 },

  // Week/day view
  timeGridContainer: { paddingBottom: 100 },
  weekHeader: { flexDirection: "row", marginLeft: 40 },
  weekDayCol: { width: 100, alignItems: "center", paddingVertical: 4 },
  weekDayNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dayCol: { width: 100, position: "relative" },
  hourLabel: { height: HOUR_H, justifyContent: "flex-start", alignItems: "flex-end", paddingRight: 4, borderTopWidth: StyleSheet.hairlineWidth },
  hourSlot: { height: HOUR_H, borderTopWidth: StyleSheet.hairlineWidth },

  // Time block (in week/day)
  timeBlock: {
    position: "absolute", borderRadius: 4, borderLeftWidth: 3,
    paddingHorizontal: 4, paddingVertical: 2, overflow: "hidden",
  },
  timeBlockTitle: { fontSize: 11, fontWeight: "600" },
  timeBlockTime: { fontSize: 9 },

  // Now indicator
  nowLine: { position: "absolute", left: 0, right: 0, height: 2, zIndex: 10 },
  nowDot: { width: 8, height: 8, borderRadius: 4, position: "absolute", left: -4, top: -3 },

  // Schedule view
  scheduleItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, marginBottom: 6 },
  scheduleDot: { width: 8, height: 8, borderRadius: 4 },

  // Shared
  fab: { position: "absolute", right: 16, bottom: 24, borderRadius: SHAPE.lg },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },
  typeChip: { borderRadius: SHAPE.pill, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center" },
  filterChip: { borderRadius: SHAPE.pill, paddingHorizontal: 10, paddingVertical: 5 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
});

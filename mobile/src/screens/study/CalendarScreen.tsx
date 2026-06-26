import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
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

const HOUR_H = 54;
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<"event" | "deadline">("event");
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(toDateStr(new Date()));
  const [newType, setNewType] = useState("event");
  const [newPriority, setNewPriority] = useState("medium");
  const [newSubject, setNewSubject] = useState("");
  const scrollRef = useRef<ScrollView>(null);

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

  const weekStart = useMemo(() => startOfWeek(focusDate), [focusDate]);
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }), [weekStart]);

  const isToday = (d: Date) =>
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const todayTop = useMemo(() => {
    const min = now.getHours() * 60 + now.getMinutes();
    return (min / 60) * HOUR_H;
  }, [now]);

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
  const goToday = () => {
    setFocusDate(new Date());
    setSelectedDate(new Date());
  };

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

  const surfaceLow = c.surfaceContainerLow ?? c.surfaceVariant;
  const surfaceHigh = c.surfaceContainerHigh ?? paperTheme.colors.surface;
  const outline = c.outlineVariant ?? "rgba(128,128,128,0.2)";

  const viewControls = (
    <View style={{ paddingHorizontal: 4 }}>
      <View style={styles.navRow}>
        <Pressable onPress={prev} style={styles.navBtn} hitSlop={8}>
          <Icon name="chevron-left" size={22} color={paperTheme.colors.onSurface} />
        </Pressable>
        <Pressable onPress={goToday} style={styles.todayBtn}>
          <Text variant="titleMedium" style={{ fontWeight: "600", color: paperTheme.colors.onSurface, letterSpacing: -0.3 }}>
            {viewTitle}
          </Text>
        </Pressable>
        <Pressable onPress={next} style={styles.navBtn} hitSlop={8}>
          <Icon name="chevron-right" size={22} color={paperTheme.colors.onSurface} />
        </Pressable>
      </View>
      {view !== "schedule" && (
        <View style={{ paddingHorizontal: 12, marginBottom: 6 }}>
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
            style={{ height: 32 }}
          />
        </View>
      )}
      {termInfo && (
        <View style={styles.termRow}>
          <View style={[styles.termBar, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
            <View style={[styles.termFill, { width: `${termInfo.progress}%`, backgroundColor: brand.primary }]} />
          </View>
          <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, flexShrink: 0, textAlign: "right" }}>
            {termInfo.term.label} {termInfo.week}/{termInfo.totalWeeks} wks
          </Text>
        </View>
      )}
    </View>
  );

  const monthGrid = (
    <>
      <View style={styles.weekdayRow}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <Text key={i} variant="labelSmall" style={[styles.weekdayLabel, { color: paperTheme.colors.onSurfaceVariant }]}>{d}</Text>
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
          const selected = selectedDate && isSameDay(dateObj, selectedDate);

          return (
            <Pressable
              key={d}
              style={[styles.dayCell, selected && { backgroundColor: surfaceHigh }]}
              onPress={() => {
                setSelectedDate(dateObj);
                if (view === "month") setFocusDate(dateObj);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${dateObj.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}, ${dayE.length} events, ${dayDl.length} deadlines`}
            >
              <View style={styles.dayNumRow}>
                {today ? (
                  <View style={[styles.todayCircle]}>
                    <Text style={styles.todayText}>{d}</Text>
                  </View>
                ) : (
                  <Text style={[styles.dayNum, { color: paperTheme.colors.onSurface }]}>{d}</Text>
                )}
              </View>
              {hasItems && (
                <View style={styles.dayEventRow}>
                  {[...dayE, ...dayDl.map((dl: any) => ({ ...dl, _isDeadline: true }))].slice(0, 3).map((item: any, i: number) => {
                    const color = item._isDeadline
                      ? (item.priority === "high" ? "#ef4444" : item.priority === "low" ? "#10b981" : "#f59e0b")
                      : getEventColor(item.type, customTypes);
                    return <View key={item.id ?? i} style={[styles.eventPill, { backgroundColor: color }]} />;
                  })}
                  {dayE.length + dayDl.length > 3 && (
                    <Text style={[styles.moreText, { color: paperTheme.colors.onSurfaceVariant }]}>
                      +{dayE.length + dayDl.length - 3}
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {selectedDate && (
        <View style={[styles.selectedDetail, { borderTopColor: outline }]}>
          <View style={styles.selectedDateHeader}>
            <Text variant="titleSmall" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>
              {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </Text>
          </View>
          {(() => {
            const selEvents = events.filter((e: any) => toDateStr(new Date(e.date)) === toDateStr(selectedDate));
            const selDeadlines = deadlines.filter((dl: any) => toDateStr(new Date(dl.dueDate)) === toDateStr(selectedDate));
            if (selEvents.length === 0 && selDeadlines.length === 0) {
              return (
                <Pressable onPress={() => openCreate(toDateStr(selectedDate), "event")} style={styles.noEventsRow}>
                  <Icon name="plus-circle-outline" size={18} color={paperTheme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginLeft: 8 }}>
                    No events
                  </Text>
                </Pressable>
              );
            }
            return (
              <>
                {selEvents.map((e: any) => {
                  const color = getEventColor(e.type, customTypes);
                  return (
                    <Pressable key={e.id} onPress={() => handleEventPress(e)} style={styles.selectedEventRow}>
                      <View style={[styles.selectedEventDot, { backgroundColor: color }]} />
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{e.title}</Text>
                        {e.date?.includes("T") && (
                          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                            {new Date(e.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                        )}
                      </View>
                      <Text variant="labelSmall" style={{ color }}>{e.type}</Text>
                    </Pressable>
                  );
                })}
                {selDeadlines.map((dl: any) => (
                  <Pressable key={dl.id} onPress={() => handleDeadlineAction(dl)} style={styles.selectedEventRow}>
                    <View style={[styles.selectedEventDot, { backgroundColor: dl.priority === "high" ? "#ef4444" : dl.priority === "low" ? "#10b981" : "#f59e0b" }]} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{dl.title}</Text>
                      <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Deadline</Text>
                    </View>
                  </Pressable>
                ))}
              </>
            );
          })()}
        </View>
      )}
    </>
  );

  const timeGrid = (isWeek: boolean) => {
    const days = isWeek ? weekDays : [focusDate];
    return (
      <View style={styles.timeGridContainer}>
        <ScrollView horizontal={isWeek} showsHorizontalScrollIndicator={false} bounces={false}>
          <View>
            {isWeek && (
              <View style={styles.weekHeader}>
                <View style={{ width: 44 }} />
                {weekDays.map((d, i) => {
                  const today = isToday(d);
                  const selected = selectedDate && isSameDay(d, selectedDate);
                  return (
                    <Pressable
                      key={i}
                      style={[styles.weekDayCol, { width: weekColumnWidth }]}
                      onPress={() => {
                        setSelectedDate(d);
                        setFocusDate(d);
                      }}
                    >
                      <Text variant="labelSmall" style={{ color: today ? "#FF3B30" : paperTheme.colors.onSurfaceVariant, fontWeight: today ? "600" : "400", fontSize: 11 }}>
                        {WEEKDAYS_SHORT[d.getDay()]}
                      </Text>
                      <View style={[styles.weekDayNum, today && { backgroundColor: "#FF3B30" }, selected && !today && { backgroundColor: surfaceHigh }]}>
                        <Text style={{ fontWeight: today ? "600" : "400", fontSize: 17, color: today ? "#fff" : paperTheme.colors.onSurface }}>
                          {d.getDate()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {!isWeek && (
              <View style={[styles.daySingleHeader, { borderBottomColor: outline }]}>
                <Text variant="titleMedium" style={{ fontWeight: "600", color: isToday(focusDate) ? "#FF3B30" : paperTheme.colors.onSurface }}>
                  {focusDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: "row" }}>
              <View style={{ width: 44 }}>
                {HOURS.map((h) => (
                  <View key={h} style={[styles.hourLabel, { borderTopColor: outline }]}>
                    <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontSize: 10 }}>
                      {h === 0 ? "" : `${h > 12 ? h - 12 : h}${h >= 12 ? "p" : "a"}`}
                    </Text>
                  </View>
                ))}
              </View>
              {days.map((d, di) => {
                const laid = layoutEvents(events, d);
                return (
                  <View key={di} style={isWeek ? [styles.dayCol, { width: weekColumnWidth }] : { width: dayColumnWidth, position: "relative" }}>
                    <View style={[styles.hourSlotBg, { borderTopColor: outline }]}>
                      {HOURS.map((h) => (
                        <Pressable key={h} style={[styles.hourSlot, { borderTopColor: outline }]}
                          onPress={() => {
                            setNewDate(`${toDateStr(d)}T${String(h).padStart(2, "0")}:00`);
                            setCreateMode("event");
                            setShowCreate(true);
                          }}
                        />
                      ))}
                    </View>
                    {laid.map((item) => {
                      const color = getEventColor(item.type, customTypes);
                      return (
                        <Pressable key={item.id} onPress={() => handleEventPress(item)}
                          style={[styles.eventBlock, { top: item.top, height: item.height, width: `${(item.span / item.totalCols) * 94}%` as any, left: `${(item.col / item.totalCols) * 94 + 3}%` as any, backgroundColor: color + "14", borderLeftColor: color }]}>
                          <Text style={[styles.eventBlockTitle, { color }]} numberOfLines={1}>{item.title}</Text>
                          <Text style={[styles.eventBlockTime, { color: paperTheme.colors.onSurfaceVariant }]}>
                            {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {isToday(d) && (
                      <View style={[styles.nowLine, { top: todayTop }]}>
                        <View style={styles.nowDot} />
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

  const scheduleView = (
    <View style={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 }}>
      <Searchbar
        placeholder="Search events..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={{ marginBottom: 8, borderRadius: 10, height: 40, backgroundColor: c.surfaceContainerHigh ?? paperTheme.colors.surfaceVariant }}
        inputStyle={{ fontSize: 14, minHeight: 0 }}
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
      ) : scheduleDays.map(([dateStr, items]) => {
        const d = new Date(dateStr);
        const isTod = isToday(d);
        return (
          <View key={dateStr} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 8 }}>
              <Text variant="titleSmall" style={{ fontWeight: "600", color: isTod ? "#FF3B30" : paperTheme.colors.onSurface, fontSize: 15 }}>
                {isTod ? "Today" : d.toLocaleDateString("en-US", { weekday: "long" })}
              </Text>
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginLeft: 8 }}>
                {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
            </View>
            {items.map((item: any, i: number) => {
              const color = getEventColor(item.type ?? "event", customTypes);
              return (
                <Pressable key={item.id ?? i}
                  style={[styles.scheduleItem, { backgroundColor: surfaceLow }]}
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
        );
      })}
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
          <Pressable onPress={goToday} style={styles.headerTodayBtn}>
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
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={view === "month" ? { paddingBottom: 100 } : undefined}
      >
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
        ) : totalItemCount === 0 && view !== "month" ? (
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
              New {createMode === "deadline" ? "Deadline" : "Event"}
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
  headerTodayBtn: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 8, justifyContent: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 12, paddingTop: 2, paddingBottom: 4 },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  todayBtn: { flex: 1, alignItems: "center" },
  termRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  termBar: { flex: 1, height: 3, borderRadius: 1.5 },
  termFill: { height: 3, borderRadius: 1.5 },

  weekdayRow: { flexDirection: "row", marginHorizontal: 8, marginTop: 8, marginBottom: 2 },
  weekdayLabel: { flex: 1, textAlign: "center", fontWeight: "500", fontSize: 11, letterSpacing: 0.2 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8 },
  dayCell: { width: "14.28%", aspectRatio: 0.9, padding: 2, alignItems: "center", justifyContent: "flex-start", paddingTop: 6, borderRadius: 4 },
  dayNumRow: { width: "100%", alignItems: "center", marginBottom: 2, minHeight: 26 },
  todayCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#FF3B30", alignItems: "center", justifyContent: "center" },
  todayText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  dayNum: { fontSize: 15, fontWeight: "400" },
  dayEventRow: { flexDirection: "row", gap: 2, alignItems: "center", justifyContent: "center", flexWrap: "wrap", minHeight: 10 },
  eventPill: { width: 16, height: 4, borderRadius: 2 },
  moreText: { fontSize: 9, fontWeight: "600" },
  selectedDetail: { marginHorizontal: 16, marginTop: 6, marginBottom: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  selectedDateHeader: { marginBottom: 6 },
  selectedEventRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8 },
  selectedEventDot: { width: 8, height: 8, borderRadius: 4 },
  noEventsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4 },

  timeGridContainer: { paddingBottom: 100, paddingTop: 2 },
  weekHeader: { flexDirection: "row", marginLeft: 44, paddingBottom: 4 },
  weekDayCol: { alignItems: "center", paddingVertical: 4 },
  weekDayNum: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dayCol: { position: "relative" },
  daySingleHeader: { marginLeft: 44, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 2 },
  hourLabel: { height: HOUR_H, justifyContent: "flex-start", alignItems: "flex-end", paddingRight: 6, borderTopWidth: StyleSheet.hairlineWidth },
  hourSlotBg: {},
  hourSlot: { height: HOUR_H, borderTopWidth: StyleSheet.hairlineWidth, minWidth: 86 },
  eventBlock: {
    position: "absolute", borderRadius: 5, borderLeftWidth: 3,
    paddingHorizontal: 5, paddingVertical: 2, overflow: "hidden",
  },
  eventBlockTitle: { fontSize: 11, fontWeight: "600" },
  eventBlockTime: { fontSize: 9 },
  nowLine: { position: "absolute", left: 0, right: 0, height: 1.5, zIndex: 10, backgroundColor: "#FF3B30" },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B30", position: "absolute", left: -4, top: -3.25 },

  scheduleItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, marginBottom: 6 },
  scheduleDot: { width: 10, height: 10, borderRadius: 5 },

  centerState: { minHeight: 360, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl, maxHeight: "86%" },
  typeChip: { borderRadius: SHAPE.pill, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center" },
  filterChip: { borderRadius: SHAPE.pill, paddingHorizontal: 10, paddingVertical: 5 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
});

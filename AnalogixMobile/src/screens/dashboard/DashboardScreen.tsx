import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, ScrollView, Image, TextInput as RNTextInput } from "react-native";
import { Text, useTheme, Portal, Modal, TextInput, Button, Switch, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ME, USER_STATS, ACTIVITY_LOG, INCREMENT_ACTIVITY } from "../../graphql/queries/user";
import { DOCUMENTS } from "../../graphql/queries/subject";
import { EVENTS } from "../../graphql/queries/calendar";
import { FLASHCARD_SETS } from "../../graphql/queries/flashcard";
import { CREATE_CHAT_SESSION, STREAM_CHAT_MESSAGE, CHAT_STREAM } from "../../graphql/queries/chat";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import {
  ExpressiveEmptyState,
  ExpressiveHeroPanel,
  ExpressiveRailCard,
  ExpressiveListRow,
  ExpressiveScreen,
  ExpressiveSection,
  PressableScale,
} from "../../components/expressive";
import Svg, { Circle } from "react-native-svg";
import Icon from "../../components/Icon";
import { useAchievementChecker } from "../../hooks/useAchievementChecker";
import { getCachedActivity, setCachedActivity } from "../../utils/streakCache";

function greeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Morning, ${name}`;
  if (h < 17) return `Afternoon, ${name}`;
  return `Evening, ${name}`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

type WidgetId = "streak" | "chat" | "docs" | "events" | "timer" | "quicklinks" | "flashcards";

const WIDGETS: { key: WidgetId; label: string; icon: string; defaultOn: boolean }[] = [
  { key: "streak",     label: "Streak",      icon: "fire",             defaultOn: true },
  { key: "chat",       label: "AI Tutor",    icon: "message-text",     defaultOn: true },
  { key: "docs",       label: "Recent Docs", icon: "file-document-outline", defaultOn: true },
  { key: "events",     label: "Events",      icon: "calendar",         defaultOn: true },
  { key: "timer",      label: "Timer",       icon: "timer",            defaultOn: true },
  { key: "quicklinks", label: "Quick Links", icon: "link-variant",     defaultOn: true },
  { key: "flashcards", label: "Flashcards",  icon: "cards",            defaultOn: true },
];

const DEFAULT_ENABLED: WidgetId[] = WIDGETS.filter((w) => w.defaultOn).map((w) => w.key);
const STORAGE_KEY = "dashboard-widgets-v2";

function useEnabledWidgets() {
  const [enabled, setEnabled] = useState<WidgetId[]>(DEFAULT_ENABLED);
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) try { setEnabled(JSON.parse(val)); } catch { /* noop */ }
    });
  }, []);
  const save = useCallback((ids: WidgetId[]) => {
    setEnabled(ids);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);
  return { enabled, save };
}

const DAYS_SH = ["M", "T", "W", "T", "F", "S", "S"];
/** Convert JS getDay() (0=Sun) to Mon-based index (0=Mon) */
const mondayIndex = (jsDay: number) => (jsDay + 6) % 7;
const dayLabel = (d: string) => { if (!d) return ""; return DAYS_SH[mondayIndex(new Date(d).getDay())] ?? ""; };

/* ── Streak Widget ──────────────────────────────────────── */
const STREAK_MSGS = ["Start your streak today!", "Nice, keep it going!", "You're on fire!", "Unstoppable!", "Legendary!"];

function streakMsg(days: number): string {
  if (days <= 0) return STREAK_MSGS[0];
  if (days <= 2) return STREAK_MSGS[1];
  if (days <= 6) return STREAK_MSGS[2];
  if (days <= 13) return STREAK_MSGS[3];
  return STREAK_MSGS[4];
}

function getLocalDateStr(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Build an array of 7 {date, count} objects for the Mon–Sun week containing today. */
function buildWeek(activityMap: Map<string, number>): { date: string; count: number }[] {
  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const todayDate = new Date(todayStr);
  const todayDow = todayDate.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = (todayDow + 6) % 7; // days since Monday
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - mondayOffset);

  const week: { date: string; count: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = getLocalDateStr(d);
    week.push({ date: dateStr, count: activityMap.get(dateStr) ?? 0 });
  }
  return week;
}

function StreakBars({ week, brandPrimary, mutedColor }: { week: { date: string; count: number }[]; brandPrimary: string; mutedColor: string }) {
  const maxC = Math.max(1, ...week.map((d) => d.count));
  const todayStr = getLocalDateStr(new Date());
  return (
    <View style={{ flexDirection: "row", gap: 4, height: 36, alignItems: "flex-end" }}>
      {Array.from({ length: 7 }, (_, i) => {
        const day = week[i] ?? { date: "", count: 0 };
        const h = day.count > 0 ? Math.max(4, Math.min(32, 4 + (day.count / maxC) * 28)) : 4;
        const isToday = day.date === todayStr;
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 2 }}>
            <View style={{ width: "80%", height: h, borderRadius: 4, backgroundColor: isToday ? brandPrimary : day.count > 0 ? brandPrimary : brandPrimary + "18" }} />
            <Text style={{ fontSize: 9, fontWeight: "700", color: isToday ? brandPrimary : mutedColor }}>
              {DAYS_SH[i]}
            </Text>
            {isToday && <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: brandPrimary }} />}
          </View>
        );
      })}
    </View>
  );
}

function computeStreak(log: { date: string; count: number }[]): number {
  const activeDates = new Set(log.filter((r) => r.count > 0).map((r) => r.date));
  if (activeDates.size === 0) return 0;

  const todayStr = getLocalDateStr(new Date());
  // Parse "YYYY-MM-DD" without timezone ambiguity
  const [y, m, d_] = todayStr.split("-").map(Number);
  const cursor = new Date(y, m - 1, d_); // local midnight

  let streak = 0;
  while (true) {
    const dateStr = getLocalDateStr(cursor);
    if (activeDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function StreakWidget() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const { data: activityData } = useQuery(ACTIVITY_LOG, { variables: { days: 90 } });
  const liveActivity = (activityData?.activityLog ?? []) as { date: string; count: number }[];
  const allActivity = liveActivity.length > 0 ? liveActivity : getCachedActivity();
  const streak = computeStreak(allActivity);
  if (liveActivity.length > 0) setCachedActivity(liveActivity);
  const activityMap = new Map(allActivity.map((a) => [a.date, a.count]));
  const week = buildWeek(activityMap);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: SHAPE.lg, backgroundColor: paperTheme.colors.surface, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <View style={{ width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: brand.primary + "14" }}>
          <Icon name="fire" size={28} color={brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <Text variant="headlineLarge" style={{ fontWeight: "900", color: brand.primary, lineHeight: 38 }}>{streak}</Text>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: brand.primary + "14", marginBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: brand.primary, letterSpacing: 0.5, textTransform: "uppercase" }}>day streak</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: paperTheme.colors.onSurfaceVariant, marginTop: 1 }}>{streakMsg(streak)}</Text>
        </View>
      </View>

      <StreakBars week={week} brandPrimary={brand.primary} mutedColor={paperTheme.colors.onSurfaceVariant} />
    </View>
  );
}

/* ── Chat Widget ────────────────────────────────────────── */
function ChatWidget() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const [q, setQ] = useState("");
  const [resp, setResp] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [createSession] = useMutation(CREATE_CHAT_SESSION);
  const [sendMessage] = useMutation(STREAM_CHAT_MESSAGE);

  useSubscription(CHAT_STREAM, {
    variables: { sessionId: activeSessionId },
    skip: !activeSessionId,
    onData: ({ data }) => {
      const d = data?.data?.chatStream;
      if (!d) return;
      if (d.done) {
        setResp(d.fullText ?? "");
        setStreamingText("");
        setActiveSessionId(null);
        setLoading(false);
      } else {
        setStreamingText(d.fullText ?? "");
      }
    },
  });

  const send = async () => {
    const t = q.trim();
    if (!t || loading) return;
    setQ("");
    setLoading(true);
    setResp(null);
    setStreamingText("");
    try {
      const { data: sd } = await createSession({ variables: { subjectId: "general", title: "Quick chat" } });
      const sid = sd?.createChatSession?.id;
      if (sid) {
        setActiveSessionId(sid);
        await sendMessage({ variables: { sessionId: sid, content: t } });
      } else {
        setLoading(false);
      }
    } catch {
      setResp(null);
      setLoading(false);
    }
  };

  const displayText = streamingText || resp;

  return (
    <View style={{ borderRadius: SHAPE.xl, backgroundColor: paperTheme.colors.surface, padding: 16, gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="message-text" size={18} color={brand.primary} />
        <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, flex: 1 }}>AI Tutor</Text>
        <PressableScale onPress={() => navigation.navigate("Tutor", { screen: "ChatList" })}>
          <Text variant="labelSmall" style={{ color: brand.primary, fontWeight: "700" }}>Open</Text>
        </PressableScale>
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
        <RNTextInput
          style={[styles.chatInput, { backgroundColor: paperTheme.colors.surfaceVariant, color: paperTheme.colors.onSurface, borderColor: paperTheme.colors.outline }]}
          placeholder="Ask anything..." placeholderTextColor={paperTheme.colors.onSurfaceVariant}
          value={q} onChangeText={setQ} multiline editable={!loading}
        />
        <PressableScale onPress={send} disabled={!q.trim() || loading}
          style={[styles.sendBtn, { backgroundColor: brand.primary, opacity: !q.trim() || loading ? 0.5 : 1 }]}>
          {loading ? <ActivityIndicator size={14} color="#fff" /> : <Icon name="send" size={14} color="#fff" />}
        </PressableScale>
      </View>
      {displayText && (
        <View style={{ backgroundColor: brand.primary + "10", borderRadius: SHAPE.md, padding: 10 }}>
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurface }}>{displayText}</Text>
        </View>
      )}
    </View>
  );
}

/* ── Docs Widget ────────────────────────────────────────── */
function DocsWidget() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { data, loading } = useQuery(DOCUMENTS);
  const docs = (data?.documents ?? [])
    .filter((d: any) => d.title)
    .sort((a: any, b: any) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 10);

  if (loading) return (
    <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 130, height: 100, borderRadius: SHAPE.lg, backgroundColor: paperTheme.colors.surfaceVariant, opacity: 1 - i * 0.15 }} />
      ))}
    </View>
  );
  if (docs.length === 0) return (
    <View style={{ paddingVertical: 16, alignItems: "center", gap: 8 }}>
      <Icon name="file-document-outline" size={32} color={paperTheme.colors.onSurfaceVariant} />
      <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>No documents yet</Text>
      <PressableScale onPress={() => navigation.navigate("Subjects")}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: SHAPE.lg, borderWidth: 1, borderColor: paperTheme.colors.outline }}>
          <Text variant="labelLarge" style={{ color: paperTheme.colors.primary, fontWeight: "700" }}>Create one</Text>
        </View>
      </PressableScale>
    </View>
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
      {docs.map((doc: any) => (
        <PressableScale key={doc.id} onPress={() => navigation.navigate("Subjects", { screen: "DocumentEditor", params: { subjectId: doc.subjectId, documentId: doc.id } })}>
          <View style={{ width: 140, borderRadius: SHAPE.lg, backgroundColor: paperTheme.colors.surface, padding: 12, gap: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: brand.primary + "16" }}>
              <Icon name={doc.icon ?? "file-document-outline"} size={16} color={brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="labelSmall" numberOfLines={3} style={{ fontWeight: "700", color: paperTheme.colors.onSurface, lineHeight: 15 }}>{doc.title}</Text>
              <Text style={{ fontSize: 10, color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>{new Date(doc.lastUpdated).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</Text>
            </View>
          </View>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

/* ── Events Widget ──────────────────────────────────────── */
function EventsWidget() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const now = new Date();
  const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [y, m, d_] = todayStr.split("-").map(Number);
  const startOfToday = new Date(y, m - 1, d_);
  const endOfToday = new Date(y, m - 1, d_, 23, 59, 59, 999);
  const { data } = useQuery(EVENTS, { variables: { from: startOfToday.toISOString(), to: endOfToday.toISOString() } });

  // Merge events and deadlines into a single list, sorted by date ascending
  const rawEvents = (data?.events ?? []).map((ev: any) => ({
    id: ev.id,
    title: ev.title,
    date: ev.date,
    color: ev.color ?? brand.primary,
    type: "event" as const,
  }));
  const rawDeadlines = (data?.deadlines ?? []).map((dl: any) => ({
    id: dl.id,
    title: dl.title,
    date: dl.dueDate,
    color: dl.priority === "high" ? "#ef4444" : dl.priority === "medium" ? "#f59e0b" : brand.primary,
    type: "deadline" as const,
  }));
  const allItems = [...rawEvents, ...rawDeadlines]
    .filter((item) => item.date && new Date(item.date).getTime() > now.getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (allItems.length === 0) return (
    <View style={{ paddingVertical: 16, alignItems: "center", gap: 8 }}>
      <Icon name="calendar" size={32} color={paperTheme.colors.onSurfaceVariant} />
      <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>No upcoming events</Text>
      <PressableScale onPress={() => navigation.navigate("Study", { screen: "Calendar" })}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: SHAPE.lg, borderWidth: 1, borderColor: paperTheme.colors.outline }}>
          <Text variant="labelLarge" style={{ color: paperTheme.colors.primary, fontWeight: "700" }}>Add one</Text>
        </View>
      </PressableScale>
    </View>
  );

  return (
    <View style={{ gap: 4 }}>
      {allItems.map((item) => {
        const d = new Date(item.date);
        const today = new Date();
        const dayStr = d.toDateString() === today.toDateString() ? "Today" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        const icon = item.type === "deadline" ? "alert-circle" : "calendar";
        return (
          <ExpressiveListRow
            key={item.id}
            title={item.title}
            subtitle={dayStr}
            icon={icon}
            onPress={() => navigation.navigate("Study", { screen: "EventDetail", params: { eventId: item.id } })}
            trailing={<View style={{ width: 3, height: 24, borderRadius: 2, backgroundColor: item.color }} />}
          />
        );
      })}
    </View>
  );
}

/* ── Timer Widget ───────────────────────────────────────── */
const TIMER_KEY = "analogix_timer_state";
type TimerPhase = "focus" | "break";
interface TimerState { phase: TimerPhase; secondsLeft: number; running: boolean; focusDuration: number; breakDuration: number; sessionsCompleted: number; sessionTarget: number; lastTick: number; }

function useTimerState(): [TimerState, React.Dispatch<React.SetStateAction<TimerState>>] {
  const [state, setState] = useState<TimerState>({ phase: "focus", secondsLeft: 25 * 60, running: false, focusDuration: 25 * 60, breakDuration: 5 * 60, sessionsCompleted: 0, sessionTarget: 4, lastTick: Date.now() });
  useEffect(() => {
    AsyncStorage.getItem(TIMER_KEY).then((v) => {
      if (v) {
        try {
          const parsed = JSON.parse(v);
          // Unified schema: TimerScreen stores `timeLeft`, dashboard uses `secondsLeft`
          const timeLeft = typeof parsed.timeLeft === "number" ? parsed.timeLeft : (typeof parsed.secondsLeft === "number" ? parsed.secondsLeft : undefined);
          const focusDuration = typeof parsed.focusDuration === "number" ? parsed.focusDuration : 25 * 60;
          const breakDuration = typeof parsed.breakDuration === "number" ? parsed.breakDuration : 5 * 60;
          const sessionsCompleted = typeof parsed.sessionsCompleted === "number" ? parsed.sessionsCompleted : 0;
          const sessionTarget = typeof parsed.sessionTarget === "number" ? parsed.sessionTarget : 4;
          const lastTick = typeof parsed.lastTick === "number" ? parsed.lastTick : Date.now();

          // If the timer was running when the app was closed, account for elapsed time
          let effectiveTimeLeft = typeof timeLeft === "number" ? timeLeft : focusDuration;
          let effectiveRunning = !!parsed.running;
          let effectivePhase: TimerPhase = parsed.phase === "break" ? "break" : "focus";
          let effectiveSessions = sessionsCompleted;

          if (parsed.running && lastTick) {
            const elapsed = Math.floor((Date.now() - lastTick) / 1000);
            effectiveTimeLeft = Math.max(0, effectiveTimeLeft - elapsed);
            if (effectiveTimeLeft <= 0) {
              effectiveRunning = false;
              effectiveSessions += effectivePhase === "focus" ? 1 : 0;
              effectivePhase = effectivePhase === "focus" ? "break" : "focus";
              effectiveTimeLeft = effectivePhase === "focus" ? focusDuration : breakDuration;
            }
          }

          setState({
            phase: effectivePhase,
            secondsLeft: effectiveTimeLeft,
            running: effectiveRunning,
            focusDuration,
            breakDuration,
            sessionsCompleted: effectiveSessions,
            sessionTarget,
            lastTick,
          });
        } catch { /* noop */ }
      }
    });
  }, []);
  const save = useCallback((s: TimerState | ((p: TimerState) => TimerState)) => {
    const persist = (next: TimerState) => {
      // Write using the `timeLeft` field so TimerScreen can read it, plus our own `secondsLeft`
      AsyncStorage.setItem(TIMER_KEY, JSON.stringify({
        ...next,
        timeLeft: next.secondsLeft,
        lastTick: Date.now(),
      }));
    };
    if (typeof s === "function") { setState((p) => { const n = s(p); persist(n); return n; }); }
    else { setState(s); persist(s); }
  }, []);
  return [state, save];
}

function TimerWidget() {
  const { brand } = useThemeContext();
  const paperTheme = useTheme();
  const navigation = useNavigation<any>();
  const [timer, setTimer] = useTimerState();
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const SESSION_GOAL = timer.sessionTarget || 4;

  useEffect(() => {
    if (timer.running) {
      intRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev.secondsLeft <= 1) {
            const nextPhase = prev.phase === "focus" ? "break" : "focus";
            const newSessions = prev.phase === "focus" ? prev.sessionsCompleted + 1 : prev.sessionsCompleted;
            return { ...prev, phase: nextPhase, secondsLeft: nextPhase === "focus" ? prev.focusDuration : prev.breakDuration, running: false, sessionsCompleted: newSessions };
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);
    }
    return () => { if (intRef.current) clearInterval(intRef.current); };
  }, [timer.running, setTimer]);

  const mins = Math.floor(timer.secondsLeft / 60);
  const secs = timer.secondsLeft % 60;
  const totalSeconds = timer.phase === "focus" ? timer.focusDuration : timer.breakDuration;
  const progress = totalSeconds > 0 ? 1 - timer.secondsLeft / totalSeconds : 0;
  const ringSize = 56;
  const strokeWidth = 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * progress;
  const phaseColor = timer.phase === "focus" ? brand.primary : "#22c55e";

  const [showSettings, setShowSettings] = useState(false);
  const [editFocus, setEditFocus] = useState("25");
  const [editBreak, setEditBreak] = useState("5");
  const [editTarget, setEditTarget] = useState("4");

  const openSettings = useCallback(() => {
    setEditFocus(String(Math.round(timer.focusDuration / 60)));
    setEditBreak(String(Math.round(timer.breakDuration / 60)));
    setEditTarget(String(timer.sessionTarget));
    setShowSettings(true);
  }, [timer.focusDuration, timer.breakDuration, timer.sessionTarget]);

  const applySettings = useCallback(() => {
    const fd = Math.max(1, parseInt(editFocus, 10) || 25) * 60;
    const bd = Math.max(1, parseInt(editBreak, 10) || 5) * 60;
    const st = Math.min(8, Math.max(1, parseInt(editTarget, 10) || 4));
    setTimer((t) => ({
      ...t, focusDuration: fd, breakDuration: bd, sessionTarget: st,
      secondsLeft: t.phase === "focus" ? fd : bd, running: false,
    }));
    setShowSettings(false);
  }, [editFocus, editBreak, editTarget, setTimer]);

  return (
    <View style={{ borderRadius: SHAPE.xl, backgroundColor: paperTheme.colors.surface, padding: 16, gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <PressableScale onPress={() => setTimer((p) => ({ ...p, running: !p.running }))}>
          <View style={{ width: ringSize, height: ringSize }}>
            <Svg width={ringSize} height={ringSize} style={styles.timerRing}>
              <Circle cx={ringSize / 2} cy={ringSize / 2} r={radius} stroke={paperTheme.colors.surfaceVariant} strokeWidth={strokeWidth} fill="none" />
              <Circle
                cx={ringSize / 2} cy={ringSize / 2} r={radius} stroke={phaseColor} strokeWidth={strokeWidth} fill="none"
                strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round" transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>
            <View style={styles.timerRingCenter}>
              <Icon name={timer.running ? "pause" : "play"} size={20} color={phaseColor} />
            </View>
          </View>
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "900", color: paperTheme.colors.onSurface }}>
            {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: phaseColor }} />
            <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {timer.phase === "focus" ? "Focus" : "Break"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 4, marginTop: 6, alignItems: "center" }}>
            {Array.from({ length: SESSION_GOAL }, (_, i) => (
              <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i < timer.sessionsCompleted ? phaseColor : paperTheme.colors.surfaceVariant }} />
            ))}
            <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginLeft: 4 }}>{timer.sessionsCompleted}/{SESSION_GOAL}</Text>
            <PressableScale onPress={openSettings} hitSlop={8}>
              <Icon name="cog" size={14} color={paperTheme.colors.onSurfaceVariant} />
            </PressableScale>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <PressableScale onPress={() => setTimer((p) => ({ ...p, running: !p.running }))}>
            <View style={[styles.timerBtn, { backgroundColor: timer.running ? "#ef4444" : phaseColor }]}>
              <Icon name={timer.running ? "pause" : "play"} size={14} color="#fff" />
            </View>
          </PressableScale>
          <PressableScale onPress={() => setTimer((p) => ({ ...p, running: false, secondsLeft: p.focusDuration, phase: "focus" }))}>
            <View style={[styles.timerBtn, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <Icon name="restart" size={14} color={paperTheme.colors.onSurfaceVariant} />
            </View>
          </PressableScale>
        </View>
      </View>
      <PressableScale onPress={() => navigation.navigate("Study", { screen: "Timer" })} style={styles.timerLink}>
        <Text variant="labelSmall" style={{ color: brand.primary, fontWeight: "700" }}>Full timer →</Text>
      </PressableScale>

      <Portal>
        <Modal visible={showSettings} onDismiss={() => setShowSettings(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Timer settings</Text>
          <TextInput mode="outlined" label="Focus duration (min)" value={editFocus} onChangeText={setEditFocus} keyboardType="number-pad" style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Break duration (min)" value={editBreak} onChangeText={setEditBreak} keyboardType="number-pad" style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Sessions per cycle" value={editTarget} onChangeText={setEditTarget} keyboardType="number-pad" style={{ marginBottom: 20 }} />
          <Button mode="contained" onPress={applySettings}>Apply</Button>
        </Modal>
      </Portal>
    </View>
  );
}

/* ── Links Widget ───────────────────────────────────────── */
// Resources were moved into Subject Detail on web parity; no top-level link.
const ALL_LINKS = [
  { id: "chat",         label: "AI Tutor",      icon: "message-text",  screen: "ChatList" },
  { id: "subjects",     label: "Subjects",      icon: "school",        screen: "Subjects" },
  { id: "flashcards",   label: "Flashcards",    icon: "cards",         screen: "Flashcards" },
  { id: "quiz",         label: "Quiz",          icon: "help-circle",   screen: "Quiz" },
  { id: "calendar",     label: "Calendar",      icon: "calendar",      screen: "Calendar" },
  { id: "timer",        label: "Timer",         icon: "timer",         screen: "Timer" },
  { id: "achievements", label: "Achievements", icon: "trophy",       screen: "Achievements" },
  { id: "profile",      label: "Profile",       icon: "account",       screen: "ProfileHome" },
  { id: "rooms",        label: "Study Rooms",   icon: "account-group", screen: "Rooms" },
];

const LINKS_KEY = "dashboardQuickLinks";

const TAB_MAP: Record<string, string> = {
  ChatList: "Tutor", Flashcards: "Study", Quiz: "Study",
  Calendar: "Study", Timer: "Study", ProfileHome: "Profile",
  Achievements: "Home", Subjects: "Subjects", Rooms: "Rooms",
};

function navigateTo(nav: any, screen: string) {
  const tab = TAB_MAP[screen];
  if (tab) nav.navigate(tab, { screen });
  else nav.navigate(screen);
}

function LinksWidget() {
  const paperTheme = useTheme();
  const navigation = useNavigation<any>();
  const [links, setLinks] = useState<string[]>(ALL_LINKS.slice(0, 3).map((l) => l.id));
  useEffect(() => { AsyncStorage.getItem(LINKS_KEY).then((v) => { if (v) try { setLinks(JSON.parse(v)); } catch { /* noop */ } }); }, []);
  const save = useCallback((ids: string[]) => { setLinks(ids); AsyncStorage.setItem(LINKS_KEY, JSON.stringify(ids)); }, []);
  const [editing, setEditing] = useState(false);
  const active = ALL_LINKS.filter((l) => links.includes(l.id));

  return (
    <View style={{ borderRadius: SHAPE.xl, backgroundColor: paperTheme.colors.surface, padding: 16, gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>Quick Links</Text>
        <PressableScale onPress={() => setEditing(!editing)}><Icon name="tune-vertical" size={16} color={paperTheme.colors.primary} /></PressableScale>
      </View>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {active.map((l) => (
          <PressableScale key={l.id} onPress={() => { if (!editing) navigateTo(navigation, l.screen); else { save(links.filter((id) => id !== l.id)); } }}>
            <View style={[styles.linkChip, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <Icon name={l.icon} size={12} color={paperTheme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{l.label}</Text>
            </View>
          </PressableScale>
        ))}
      </View>
      {editing && (
        <View style={{ gap: 4 }}>
          {ALL_LINKS.filter((l) => !links.includes(l.id)).map((l) => (
            <PressableScale key={l.id} onPress={() => save([...links, l.id])}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
                <Icon name="plus-circle-outline" size={16} color={paperTheme.colors.primary} />
                <Text variant="bodySmall" style={{ color: paperTheme.colors.primary }}>{l.label}</Text>
              </View>
            </PressableScale>
          ))}
        </View>
      )}
    </View>
  );
}

/* Flashcards Widget */
function FlashcardsWidget() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { data: setsData, loading: sl } = useQuery(FLASHCARD_SETS);
  const sets = setsData?.flashcardSets ?? [];
  const totalCards = sets.reduce((s: number, x: any) => s + (x.cardCount ?? 0), 0);
  const totalSets = sets.length;

  if (sl) return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[0, 1].map((i) => <View key={i} style={{ flex: 1, height: 80, borderRadius: SHAPE.lg, backgroundColor: paperTheme.colors.surfaceVariant }} />)}
    </View>
  );

  if (totalSets === 0) return (
    <View style={{ paddingVertical: 16, alignItems: "center", gap: 8 }}>
      <Icon name="cards" size={32} color={paperTheme.colors.onSurfaceVariant} />
      <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>No flashcards yet</Text>
      <PressableScale onPress={() => navigation.navigate("Study", { screen: "Flashcards" })}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: SHAPE.lg, borderWidth: 1, borderColor: paperTheme.colors.outline }}>
          <Text variant="labelLarge" style={{ color: paperTheme.colors.primary, fontWeight: "700" }}>Create your first set</Text>
        </View>
      </PressableScale>
    </View>
  );

  return (
    <View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <ExpressiveRailCard value={totalSets} label="Sets" icon="cards" />
        <ExpressiveRailCard value={totalCards} label="Cards" icon="cards-outline" />
      </View>
      <PressableScale
        onPress={() => navigation.navigate("Study", { screen: "Flashcards" })}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingVertical: 12, borderRadius: SHAPE.lg, backgroundColor: brand.primary, alignItems: "center" }}>
          <Text variant="labelLarge" style={{ fontWeight: "800", color: "#fff" }}>Browse Sets</Text>
        </View>
      </PressableScale>
    </View>
  );
}

/* Customise Panel */
function CustomisePanel({ visible, enabled, onSave, onClose }: { visible: boolean; enabled: WidgetId[]; onSave: (ids: WidgetId[]) => void; onClose: () => void }) {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const [draft, setDraft] = useState(enabled);
  useEffect(() => setDraft(enabled), [enabled]);
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
        <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 16 }}>Widgets</Text>
        {WIDGETS.map((w) => {
          const on = draft.includes(w.key);
          return (
            <PressableScale key={w.key} onPress={() => setDraft(on ? draft.filter((k) => k !== w.key) : [...draft, w.key])}
              style={[styles.widgetRow, { backgroundColor: on ? paperTheme.colors.primaryContainer : paperTheme.colors.surfaceVariant }]}>
              <Icon name={w.icon} size={18} color={on ? paperTheme.colors.onPrimaryContainer : paperTheme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ flex: 1, marginLeft: 10, fontWeight: "600", color: on ? paperTheme.colors.onPrimaryContainer : paperTheme.colors.onSurfaceVariant }}>{w.label}</Text>
              <Switch value={on} onValueChange={(v) => setDraft(v ? [...draft, w.key] : draft.filter((k) => k !== w.key))} color={brand.primary} />
            </PressableScale>
          );
        })}
        <PressableScale onPress={() => setDraft(DEFAULT_ENABLED)} style={{ alignItems: "center", paddingVertical: 8, marginTop: 4 }}>
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Reset to defaults</Text>
        </PressableScale>
        <PressableScale onPress={() => { onSave(draft); onClose(); }} style={{ width: "100%" }}>
          <View style={{ paddingVertical: 12, borderRadius: SHAPE.lg, backgroundColor: brand.primary, alignItems: "center" }}>
            <Text variant="labelLarge" style={{ fontWeight: "800", color: "#fff" }}>Done</Text>
          </View>
        </PressableScale>
      </Modal>
    </Portal>
  );
}

/* Main Dashboard */
export default function DashboardScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { data: meData } = useQuery(ME);
  const [incrementActivity] = useMutation(INCREMENT_ACTIVITY);
  const me = meData?.me;
  const firstName = me?.name?.split(" ")[0] ?? "there";
  const [showSettings, setShowSettings] = useState(false);
  const { enabled, save: setEnabled } = useEnabledWidgets();
  const on = (k: WidgetId) => enabled.includes(k);

  useEffect(() => {
    const d = new Date();
    const today = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    incrementActivity({ variables: { date: today } }).catch(() => {});
  }, [incrementActivity]);
  useAchievementChecker();

  const hasWidgets = enabled.length > 0;

  return (
    <ExpressiveScreen
      title={greeting(firstName)}
      subtitle={formatDate()}
      leadingIcon="school"
      actions={
        <View style={{ flexDirection: "row", gap: 6 }}>
          <PressableScale
            onPress={() => setShowSettings(true)}
            style={[styles.avatarBox, { backgroundColor: paperTheme.colors.surfaceVariant }]}
            accessibilityLabel="Customise dashboard"
          >
            <Icon name="tune-vertical" size={20} color={paperTheme.colors.onSurfaceVariant} />
          </PressableScale>
          <PressableScale
            onPress={() => navigation.navigate("Profile", { screen: "ProfileHome" })}
            style={[styles.avatarBox, { backgroundColor: me?.avatarUrl ? "transparent" : brand.primary }]}
            accessibilityLabel="Open profile"
          >
            {me?.avatarUrl ? (
              <Image source={{ uri: me.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={{ fontWeight: "800", fontSize: 16, color: paperTheme.colors.onPrimary }}>{(me?.name ?? "U").charAt(0)}</Text>
            )}
          </PressableScale>
        </View>
      }
    >


      {hasWidgets ? (
        <>
          {on("streak") && <ExpressiveSection title="Streak"><StreakWidget /></ExpressiveSection>}
          {on("chat") && <ExpressiveSection title="Quick Chat"><ChatWidget /></ExpressiveSection>}
          {on("docs") && <ExpressiveSection title="Recent Docs"><DocsWidget /></ExpressiveSection>}
          {on("events") && <ExpressiveSection title="Today" actionLabel="View all" onAction={() => navigation.navigate("Study", { screen: "Calendar" })}><EventsWidget /></ExpressiveSection>}
          {on("timer") && <ExpressiveSection title="Timer"><TimerWidget /></ExpressiveSection>}
          {on("quicklinks") && <ExpressiveSection title="Quick Links"><LinksWidget /></ExpressiveSection>}
          {on("flashcards") && <ExpressiveSection title="Flashcards"><FlashcardsWidget /></ExpressiveSection>}
        </>
      ) : (
        <View style={{ paddingVertical: 40, alignItems: "center", gap: 12 }}>
          <ExpressiveEmptyState
            icon="widgets"
            title="No widgets enabled"
            subtitle="Customise your dashboard to see stats, quick actions, and more."
          />
          <PressableScale onPress={() => setShowSettings(true)}>
            <View style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: SHAPE.lg, backgroundColor: brand.primary }}>
              <Text variant="labelLarge" style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>Customise dashboard</Text>
            </View>
          </PressableScale>
        </View>
      )}

      <CustomisePanel visible={showSettings} enabled={enabled} onSave={setEnabled} onClose={() => setShowSettings(false)} />
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  avatarBox: { width: 44, height: 44, borderRadius: SHAPE.pill, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: 44, height: 44, borderRadius: SHAPE.pill },
  chatInput: { flex: 1, borderRadius: SHAPE.lg, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 80, borderWidth: StyleSheet.hairlineWidth, fontSize: 14, lineHeight: 20 },
  sendBtn: { width: 36, height: 36, borderRadius: SHAPE.pill, alignItems: "center", justifyContent: "center" },
  timerToggle: { width: 36, height: 36, borderRadius: SHAPE.pill, alignItems: "center", justifyContent: "center" },
  linkChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: SHAPE.pill },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },
  widgetRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderRadius: SHAPE.pill, marginBottom: 8 },
  timerRing: { position: "absolute", top: 0, left: 0 },
  timerRingCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  timerBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  timerLink: { alignItems: "center", paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(128,128,128,0.2)" },
});

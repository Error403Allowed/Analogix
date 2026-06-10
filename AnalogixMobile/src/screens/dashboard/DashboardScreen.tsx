import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, ScrollView, TextInput as RNTextInput } from "react-native";
import { Text, useTheme, Portal, Modal, Switch, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ME, USER_STATS, ACTIVITY_LOG, INCREMENT_ACTIVITY } from "../../graphql/queries/user";
import { DOCUMENTS } from "../../graphql/queries/subject";
import { EVENTS } from "../../graphql/queries/calendar";
import { FLASHCARD_SETS, FLASHCARDS_DUE } from "../../graphql/queries/flashcard";
import { CREATE_CHAT_SESSION, STREAM_CHAT_MESSAGE } from "../../graphql/queries/chat";
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
import Icon from "../../components/Icon";
import { useAchievementChecker } from "../../hooks/useAchievementChecker";

function greeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Hey ${name} ✦`;
  if (h < 17) return `Hey ${name} ✦`;
  return `Hey ${name} ✦`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

type WidgetId = "stats" | "chat" | "docs" | "events" | "timer" | "quicklinks" | "flashcards";

const WIDGETS: { key: WidgetId; label: string; icon: string; defaultOn: boolean }[] = [
  { key: "stats",      label: "Stats",       icon: "trophy",           defaultOn: true },
  { key: "chat",       label: "AI Tutor",    icon: "message-text",     defaultOn: true },
  { key: "docs",       label: "Recent Docs", icon: "file-text",        defaultOn: true },
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

const DAYS_SH = ["S", "M", "T", "W", "T", "F", "S"];
const dayLabel = (d: string) => { if (!d) return ""; return DAYS_SH[new Date(d).getDay()] ?? ""; };

/* ── Stats Widget ──────────────────────────────────────── */
const STREAK_MSGS = ["Start your streak today!", "Nice, keep it going!", "You're on fire!", "Unstoppable!", "Legendary!"];

function streakMsg(days: number): string {
  if (days <= 0) return STREAK_MSGS[0];
  if (days <= 2) return STREAK_MSGS[1];
  if (days <= 6) return STREAK_MSGS[2];
  if (days <= 13) return STREAK_MSGS[3];
  return STREAK_MSGS[4];
}

function StreakBars({ week, brandPrimary, mutedColor }: { week: { date: string; count: number }[]; brandPrimary: string; mutedColor: string }) {
  const maxC = Math.max(1, ...week.map((d) => d.count));
  const todayIdx = new Date().getDay();
  return (
    <View style={{ flexDirection: "row", gap: 4, height: 36, alignItems: "flex-end" }}>
      {Array.from({ length: 7 }, (_, i) => {
        const day = week[i] ?? { date: "", count: 0 };
        const h = day.count > 0 ? Math.max(4, Math.min(32, 4 + (day.count / maxC) * 28)) : 4;
        const isToday = todayIdx === new Date(day.date).getDay();
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 2 }}>
            <View style={{ width: "80%", height: h, borderRadius: 4, backgroundColor: isToday ? brandPrimary : day.count > 0 ? brandPrimary : brandPrimary + "18" }} />
            <Text style={{ fontSize: 9, fontWeight: "700", color: isToday ? brandPrimary : mutedColor }}>
              {week[i] ? dayLabel(week[i].date) : DAYS_SH[i]}
            </Text>
            {isToday && <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: brandPrimary }} />}
          </View>
        );
      })}
    </View>
  );
}

function StatsWidget() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const { data: statsData } = useQuery(USER_STATS);
  const { data: activityData } = useQuery(ACTIVITY_LOG, { variables: { days: 7 } });
  const s = statsData?.userStats;
  const week = (activityData?.activityLog ?? []) as { date: string; count: number }[];
  const streak = s?.currentStreak ?? 0;

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
        {streak >= 7 && (
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: SHAPE.pill, backgroundColor: brand.primary + "14" }}>
            <Text variant="labelSmall" style={{ fontWeight: "800", color: brand.primary }}>HOT</Text>
          </View>
        )}
      </View>

      <StreakBars week={week} brandPrimary={brand.primary} mutedColor={paperTheme.colors.onSurfaceVariant} />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <ExpressiveRailCard value={s?.quizzesDone ?? 0} label="Quizzes" icon="clipboard-check" />
        <ExpressiveRailCard value={`${s?.accuracy ?? 0}%`} label="Accuracy" icon="target" />
        <ExpressiveRailCard value={s?.conversationsCount ?? 0} label="Chats" icon="message-text" />
      </View>
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
  const [loading, setLoading] = useState(false);
  const [createSession] = useMutation(CREATE_CHAT_SESSION);
  const [sendMessage] = useMutation(STREAM_CHAT_MESSAGE);

  const send = async () => {
    const t = q.trim();
    if (!t || loading) return;
    setQ("");
    setLoading(true);
    setResp(null);
    try {
      const { data: sd } = await createSession({ variables: { subjectId: "general", title: "Quick chat" } });
      const sid = sd?.createChatSession?.id;
      if (sid) {
        const { data: md } = await sendMessage({ variables: { sessionId: sid, content: t } });
        setResp(md?.streamChatMessage?.content ?? null);
      }
    } catch { setResp(null); } finally { setLoading(false); }
  };

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
      {resp && (
        <View style={{ backgroundColor: brand.primary + "10", borderRadius: SHAPE.md, padding: 10 }}>
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurface }}>{resp}</Text>
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
        <PressableScale key={doc.id} onPress={() => navigation.navigate("SubjectDetail", { subjectId: doc.subjectId, documentId: doc.id })}>
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
  const to = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { data } = useQuery(EVENTS, { variables: { from: now.toISOString(), to: to.toISOString() } });
  const events = (data?.events ?? []).slice(0, 5);

  if (events.length === 0) return (
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
      {events.map((ev: any) => {
        const d = new Date(ev.date);
        const today = new Date();
        const dayStr = d.toDateString() === today.toDateString() ? "Today" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return (
          <ExpressiveListRow
            key={ev.id}
            title={ev.title}
            subtitle={dayStr}
            icon="calendar"
            onPress={() => navigation.navigate("Study", { screen: "Calendar" })}
            trailing={<View style={{ width: 3, height: 24, borderRadius: 2, backgroundColor: ev.color ?? brand.primary }} />}
          />
        );
      })}
    </View>
  );
}

/* ── Timer Widget ───────────────────────────────────────── */
const TIMER_KEY = "analogix_timer_state";
type TimerPhase = "focus" | "break";
interface TimerState { phase: TimerPhase; secondsLeft: number; running: boolean; focusDuration: number; breakDuration: number; sessionsCompleted: number; }

function useTimerState(): [TimerState, React.Dispatch<React.SetStateAction<TimerState>>] {
  const [state, setState] = useState<TimerState>({ phase: "focus", secondsLeft: 25 * 60, running: false, focusDuration: 25 * 60, breakDuration: 5 * 60, sessionsCompleted: 0 });
  useEffect(() => { AsyncStorage.getItem(TIMER_KEY).then((v) => { if (v) try { setState(JSON.parse(v)); } catch { /* noop */ } }); }, []);
  const save = useCallback((s: TimerState | ((p: TimerState) => TimerState)) => {
    if (typeof s === "function") { setState((p) => { const n = s(p); AsyncStorage.setItem(TIMER_KEY, JSON.stringify(n)); return n; }); }
    else { setState(s); AsyncStorage.setItem(TIMER_KEY, JSON.stringify(s)); }
  }, []);
  return [state, save];
}

function TimerWidget() {
  const { brand } = useThemeContext();
  const paperTheme = useTheme();
  const navigation = useNavigation<any>();
  const [timer, setTimer] = useTimerState();
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const SESSION_GOAL = 4;

  useEffect(() => {
    if (timer.running) {
      intRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev.secondsLeft <= 1) {
            const nextPhase = prev.phase === "focus" ? "break" : "focus";
            return { ...prev, phase: nextPhase, secondsLeft: nextPhase === "focus" ? prev.focusDuration : prev.breakDuration, running: false, sessionsCompleted: prev.phase === "focus" ? prev.sessionsCompleted + 1 : prev.sessionsCompleted };
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
  const strokeDashoffset = circumference * (1 - progress);
  const phaseColor = timer.phase === "focus" ? brand.primary : "#22c55e";

  return (
    <View style={{ borderRadius: SHAPE.xl, backgroundColor: paperTheme.colors.surface, padding: 16, gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <PressableScale onPress={() => setTimer((p) => ({ ...p, running: !p.running }))}>
          <View style={{ width: ringSize, height: ringSize }}>
            <View style={[styles.timerRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderWidth: strokeWidth, borderColor: paperTheme.colors.surfaceVariant }]} />
            <View style={[styles.timerRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderWidth: strokeWidth, borderColor: phaseColor, borderLeftColor: "transparent", borderBottomColor: timer.running ? phaseColor : "transparent", transform: [{ rotate: `${progress * 360}deg` }] }]} />
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
          <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
            {Array.from({ length: SESSION_GOAL }, (_, i) => (
              <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i < timer.sessionsCompleted ? phaseColor : paperTheme.colors.surfaceVariant }} />
            ))}
            <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginLeft: 4 }}>{timer.sessionsCompleted}/{SESSION_GOAL}</Text>
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
  const { data: dueData, loading: dl } = useQuery(FLASHCARDS_DUE);
  const total = (setsData?.flashcardSets ?? []).reduce((s: number, x: any) => s + (x.cardCount ?? 0), 0);
  const due = (dueData?.flashcardsDue ?? []).length;

  if (sl || dl) return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[0, 1].map((i) => <View key={i} style={{ flex: 1, height: 80, borderRadius: SHAPE.lg, backgroundColor: paperTheme.colors.surfaceVariant }} />)}
    </View>
  );

  if (total === 0) return (
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
        <ExpressiveRailCard value={total} label="Cards" icon="cards" />
        <ExpressiveRailCard value={due} label="Due now" icon="clock-outline" />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <PressableScale
          disabled={due === 0}
          onPress={() => navigation.navigate("Study", { screen: "Flashcards" })}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, paddingVertical: 10, borderRadius: SHAPE.lg, backgroundColor: due === 0 ? paperTheme.colors.surfaceVariant : brand.primary, alignItems: "center", opacity: due === 0 ? 0.5 : 1 }}>
            <Text variant="labelLarge" style={{ fontWeight: "800", color: due === 0 ? paperTheme.colors.onSurfaceVariant : "#fff" }}>
              Review {due > 0 ? `(${due})` : ""}
            </Text>
          </View>
        </PressableScale>
        <PressableScale
          onPress={() => navigation.navigate("Study", { screen: "Flashcards" })}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, paddingVertical: 10, borderRadius: SHAPE.lg, borderWidth: 1, borderColor: paperTheme.colors.outline, alignItems: "center" }}>
            <Text variant="labelLarge" style={{ fontWeight: "800", color: paperTheme.colors.primary }}>Browse</Text>
          </View>
        </PressableScale>
      </View>
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
  const { data: statsData } = useQuery(USER_STATS);
  const [incrementActivity] = useMutation(INCREMENT_ACTIVITY);
  const me = meData?.me;
  const stats = statsData?.userStats;
  const firstName = me?.name?.split(" ")[0] ?? "there";
  const [showSettings, setShowSettings] = useState(false);
  const { enabled, save: setEnabled } = useEnabledWidgets();
  const on = (k: WidgetId) => enabled.includes(k);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
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
            style={[styles.avatarBox, { backgroundColor: brand.primary }]}
            accessibilityLabel="Open profile"
          >
            <Text style={{ fontWeight: "800", fontSize: 16, color: paperTheme.colors.onPrimary }}>{(me?.name ?? "U").charAt(0)}</Text>
          </PressableScale>
        </View>
      }
    >
      <ExpressiveHeroPanel>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="labelLarge" style={{ color: paperTheme.colors.onPrimaryContainer, fontWeight: "800" }}>Current level</Text>
            <Text variant="displaySmall" numberOfLines={1} adjustsFontSizeToFit style={{ color: paperTheme.colors.onPrimaryContainer, fontWeight: "900" }}>
              Level {stats?.level ?? 1}
            </Text>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onPrimaryContainer, opacity: 0.8 }}>{stats?.xp ?? 0} XP earned</Text>
          </View>
          <View style={{ width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: brand.primary + "22" }}>
            <Icon name="trophy" size={32} color={brand.primary} />
          </View>
        </View>
      </ExpressiveHeroPanel>

      {hasWidgets ? (
        <>
          {on("stats") && <ExpressiveSection title="Stats"><StatsWidget /></ExpressiveSection>}
          {on("chat") && <ExpressiveSection title="Quick Chat"><ChatWidget /></ExpressiveSection>}
          {on("docs") && <ExpressiveSection title="Recent Docs"><DocsWidget /></ExpressiveSection>}
          {on("events") && <ExpressiveSection title="Upcoming" actionLabel="View all" onAction={() => navigation.navigate("Study", { screen: "Calendar" })}><EventsWidget /></ExpressiveSection>}
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
  avatarBox: { width: 44, height: 44, borderRadius: SHAPE.pill, alignItems: "center", justifyContent: "center" },
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

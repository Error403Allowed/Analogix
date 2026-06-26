import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, AppState, type AppStateStatus } from "react-native";
import { Text, useTheme, Portal, Modal, TextInput, Button } from "react-native-paper";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "@apollo/client";
import { INCREMENT_ACTIVITY } from "../../graphql/queries/user";
import { useNavigation } from "@react-navigation/native";
import Icon from "../../components/Icon";
import { ExpressiveScreen } from "../../components/expressive";

type Phase = "focus" | "break";

interface TimerState {
  phase: Phase;
  timeLeft: number;
  running: boolean;
  sessionsCompleted: number;
  focusDuration: number;
  breakDuration: number;
  sessionTarget: number;
  lastTick: number;
}

const STORAGE_KEY = "analogix_timer_state";
const SIZE = 240;
const STROKE = 8;
const R = (SIZE - STROKE) / 2 - 4;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRC = 2 * Math.PI * R;

function defaultState(): TimerState {
  return {
    phase: "focus",
    timeLeft: 25 * 60,
    running: false,
    sessionsCompleted: 0,
    focusDuration: 25 * 60,
    breakDuration: 5 * 60,
    sessionTarget: 4,
    lastTick: Date.now(),
  };
}

async function loadState(): Promise<TimerState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const saved = JSON.parse(raw) as Partial<TimerState>;
    const state: TimerState = {
      phase: saved.phase === "break" ? "break" : "focus",
      timeLeft: typeof saved.timeLeft === "number" ? Math.max(0, Math.floor(saved.timeLeft)) : defaultState().timeLeft,
      running: !!saved.running,
      sessionsCompleted: typeof saved.sessionsCompleted === "number" ? Math.max(0, Math.floor(saved.sessionsCompleted)) : 0,
      focusDuration: typeof saved.focusDuration === "number" && saved.focusDuration >= 60 ? saved.focusDuration : 25 * 60,
      breakDuration: typeof saved.breakDuration === "number" && saved.breakDuration >= 60 ? saved.breakDuration : 5 * 60,
      sessionTarget: typeof saved.sessionTarget === "number" ? Math.min(8, Math.max(1, Math.floor(saved.sessionTarget))) : 4,
      lastTick: typeof saved.lastTick === "number" ? saved.lastTick : Date.now(),
    };
    if (state.running && state.lastTick) {
      const elapsed = Math.floor((Date.now() - state.lastTick) / 1000);
      state.timeLeft = Math.max(0, state.timeLeft - elapsed);
      if (state.timeLeft <= 0) {
        state.running = false;
        state.sessionsCompleted += 1;
        const nextPhase = state.phase === "focus" ? "break" : "focus";
        state.phase = nextPhase;
        state.timeLeft = nextPhase === "focus" ? state.focusDuration : state.breakDuration;
        if (state.sessionsCompleted % state.sessionTarget === 0 && state.phase === "break") {
          state.phase = "focus";
          state.timeLeft = state.focusDuration;
          state.sessionsCompleted = 0;
        }
      }
    }
    return state;
  } catch {
    return defaultState();
  }
}

function saveState(state: TimerState) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastTick: Date.now() })).catch(() => {});
}

export default function TimerScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const [timer, setTimer] = useState<TimerState>(defaultState());
  const [loaded, setLoaded] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [incrementActivity] = useMutation(INCREMENT_ACTIVITY);
  const [showSettings, setShowSettings] = useState(false);
  const [editFocus, setEditFocus] = useState("25");
  const [editBreak, setEditBreak] = useState("5");
  const [editTarget, setEditTarget] = useState("4");
  const [startedOnce, setStartedOnce] = useState(false);

  useEffect(() => {
    loadState().then((s) => {
      setTimer(s);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") {
        loadState().then((s) => setTimer(s));
      }
    });
    return () => sub.remove();
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveState(timer);
  }, [timer, loaded]);

  useEffect(() => {
    if (timer.running) {
      setStartedOnce(true);
      interval.current = setInterval(() => {
        setTimer((t) => {
          const next = { ...t, timeLeft: t.timeLeft - 1 };
          if (next.timeLeft <= 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            next.running = false;
            const d = new Date();
            const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
            incrementActivity({ variables: { date: localDate } }).catch(() => {});
            if (next.phase === "focus") {
              next.phase = "break";
              next.timeLeft = next.breakDuration;
              next.sessionsCompleted += 1;
              if (next.sessionsCompleted >= next.sessionTarget) {
                next.phase = "focus";
                next.timeLeft = next.focusDuration;
                next.sessionsCompleted = 0;
              }
            } else {
              next.phase = "focus";
              next.timeLeft = next.focusDuration;
            }
          }
          return next;
        });
      }, 1000);
    } else if (interval.current) {
      clearInterval(interval.current);
      interval.current = null;
    }
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [timer.running, loaded, incrementActivity]);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimer((t) => ({ ...t, running: !t.running }));
  };

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimer((t) => ({ ...t, running: false, phase: "focus", timeLeft: t.focusDuration, sessionsCompleted: 0 }));
    setStartedOnce(false);
  };

  const skip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimer((t) => {
      const next = { ...t, running: false };
      if (next.phase === "focus") {
        next.phase = "break";
        next.timeLeft = next.breakDuration;
        next.sessionsCompleted += 1;
      } else {
        next.phase = "focus";
        next.timeLeft = next.focusDuration;
      }
      return next;
    });
  };

  const openSettings = () => {
    setEditFocus(String(Math.round(timer.focusDuration / 60)));
    setEditBreak(String(Math.round(timer.breakDuration / 60)));
    setEditTarget(String(timer.sessionTarget));
    setShowSettings(true);
  };

  const applySettings = () => {
    const fd = Math.max(1, parseInt(editFocus, 10) || 25) * 60;
    const bd = Math.max(1, parseInt(editBreak, 10) || 5) * 60;
    const st = Math.min(8, Math.max(1, parseInt(editTarget, 10) || 4));
    setTimer((t) => ({
      ...t, focusDuration: fd, breakDuration: bd, sessionTarget: st,
      timeLeft: t.phase === "focus" ? fd : bd, running: false,
    }));
    setShowSettings(false);
  };

  if (!loaded) return null;

  const total = timer.phase === "focus" ? timer.focusDuration : timer.breakDuration;
  const progress = 1 - timer.timeLeft / total;
  const dashOffset = CIRC * progress;
  const minutes = Math.floor(timer.timeLeft / 60);
  const secs = timer.timeLeft % 60;
  const timerLabel = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const isFocus = timer.phase === "focus";
  const phaseColor = isFocus ? brand.primary : "#22c55e";
  const phaseIcon = isFocus ? "timer" : "coffee";
  const phaseLabel = isFocus ? "Focus" : "Break";
  const bgGradient = isFocus ? brand.primary + "08" : "#22c55e08";

  const settingsIcon = (
    <Pressable onPress={openSettings} style={styles.iconBtn}>
      <Icon name="cog" size={20} color={paperTheme.colors.onSurfaceVariant} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgGradient }}>
      <ExpressiveScreen
        title="Timer"
        subtitle={`${Math.round(timer.focusDuration / 60)}m focus \u00b7 ${timer.sessionTarget} sessions`}
        onBack={() => navigation.goBack()}
        scroll={false}
        contentStyle={{ padding: 0, gap: 0, alignItems: "center" }}
        actions={settingsIcon}
      >
        <View style={styles.phaseBadge}>
          <View style={[styles.phasePill, { backgroundColor: phaseColor + "18" }]}>
            <Icon name={phaseIcon} size={16} color={phaseColor} />
            <Text variant="labelSmall" style={{ color: phaseColor, fontWeight: "800", letterSpacing: 1 }}>{phaseLabel}</Text>
          </View>
        </View>

        <View style={[styles.ringContainer, { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outlineVariant }]}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={CX} cy={CY} r={R} stroke={paperTheme.colors.surfaceVariant} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={CX} cy={CY} r={R} stroke={phaseColor} strokeWidth={STROKE} fill="none"
              strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={dashOffset}
              strokeLinecap="round" transform={`rotate(-90 ${CX} ${CY})`}
            />
          </Svg>
          <View style={styles.timeOverlay}>
            <Pressable onPress={openSettings}>
              <Text style={[styles.timeText, { color: paperTheme.colors.onSurface }]}>{timerLabel}</Text>
            </Pressable>
            {!timer.running && (
              <View style={[styles.editHint, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontWeight: "700", letterSpacing: 0.5 }}>
                  TAP TO EDIT
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sessionDots}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {Array.from({ length: timer.sessionTarget }, (_, i) => {
              const effectiveCompleted = startedOnce ? timer.sessionsCompleted : 0;
              const filled = i < effectiveCompleted % timer.sessionTarget;
              return (
                <View
                  key={i}
                  style={[styles.dot, {
                    backgroundColor: filled ? phaseColor : paperTheme.colors.surfaceVariant,
                    borderColor: filled ? phaseColor : "transparent",
                  }]}
                />
              );
            })}
            <Pressable onPress={openSettings} style={{ marginLeft: 8 }}>
              <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontWeight: "600", letterSpacing: 1 }}>
                {timer.sessionTarget} SESSIONS
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.controls, { paddingBottom: 24 }]}>
          <Pressable
            onPress={reset}
            style={({ pressed }) => [styles.ctrlBtn, { backgroundColor: paperTheme.colors.surfaceVariant, borderRadius: SHAPE.lg, opacity: pressed ? 0.7 : 1 }]}
          >
            <Icon name="restart" size={20} color={paperTheme.colors.onSurfaceVariant} />
          </Pressable>
          <Pressable
            onPress={toggle}
            style={({ pressed }) => [styles.startBtn, { backgroundColor: phaseColor, borderRadius: SHAPE.xl, elevation: 6, opacity: pressed ? 0.9 : 1 }]}
          >
            <Icon name={timer.running ? "pause" : "play"} size={22} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14, letterSpacing: 1, marginLeft: 8 }}>
              {timer.running ? "PAUSE" : "START"}
            </Text>
          </Pressable>
          <Pressable
            onPress={skip}
            style={({ pressed }) => [styles.ctrlBtn, { backgroundColor: paperTheme.colors.surfaceVariant, borderRadius: SHAPE.lg, opacity: pressed ? 0.7 : 1 }]}
          >
            <Icon name="skip-next" size={20} color={paperTheme.colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {!timer.running && (
          <View style={styles.durationRow}>
            <Pressable onPress={() => { setEditFocus(String(Math.round(timer.focusDuration / 60))); setEditBreak(String(Math.round(timer.breakDuration / 60))); setShowSettings(true); }}>
              <View style={[styles.durationPill, { backgroundColor: paperTheme.colors.surface }]}>
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontWeight: "600" }}>FOCUS</Text>
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurface, fontWeight: "800" }}>{Math.round(timer.focusDuration / 60)}m</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => { setEditFocus(String(Math.round(timer.focusDuration / 60))); setEditBreak(String(Math.round(timer.breakDuration / 60))); setShowSettings(true); }}>
              <View style={[styles.durationPill, { backgroundColor: paperTheme.colors.surface }]}>
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontWeight: "600" }}>BREAK</Text>
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurface, fontWeight: "800" }}>{Math.round(timer.breakDuration / 60)}m</Text>
              </View>
            </Pressable>
          </View>
        )}

        <Portal>
          <Modal visible={showSettings} onDismiss={() => setShowSettings(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
            <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Timer settings</Text>
            <TextInput mode="outlined" label="Focus duration (min)" value={editFocus} onChangeText={setEditFocus} keyboardType="number-pad" style={{ marginBottom: 12 }} />
            <TextInput mode="outlined" label="Break duration (min)" value={editBreak} onChangeText={setEditBreak} keyboardType="number-pad" style={{ marginBottom: 12 }} />
            <TextInput mode="outlined" label="Sessions per cycle" value={editTarget} onChangeText={setEditTarget} keyboardType="number-pad" style={{ marginBottom: 20 }} />
            <Button mode="contained" onPress={applySettings}>Apply</Button>
          </Modal>
        </Portal>
      </ExpressiveScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  phaseBadge: { marginTop: 28, marginBottom: 8 },
  phasePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    width: SIZE + 40,
    height: SIZE + 40,
    borderRadius: (SIZE + 40) / 2,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
  },
  timeOverlay: { position: "absolute", alignItems: "center", justifyContent: "center" },
  timeText: { fontSize: 52, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: 2 },
  editHint: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  sessionDots: { marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  controls: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 16 },
  ctrlBtn: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  startBtn: { flexDirection: "row", paddingHorizontal: 36, paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  durationRow: { flexDirection: "row", gap: 12, marginTop: 12, alignItems: "center" },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,128,0.15)",
  },
  modal: { margin: 20, padding: 24, borderRadius: 26 },
});

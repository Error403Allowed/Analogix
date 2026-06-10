import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, AppState, type AppStateStatus } from "react-native";
import { Text, useTheme, IconButton, Portal, Modal, TextInput, Button } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "@apollo/client";
import { INCREMENT_ACTIVITY } from "../../graphql/queries/user";
import { useNavigation } from "@react-navigation/native";

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
        state.timeLeft = state.phase === "focus" ? state.breakDuration : state.focusDuration;
        state.phase = state.phase === "focus" ? "break" : "focus";
        state.sessionsCompleted += 1;
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
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const navigation = useNavigation();
  const [timer, setTimer] = useState<TimerState>(defaultState());
  const [loaded, setLoaded] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [incrementActivity] = useMutation(INCREMENT_ACTIVITY);
  const [showSettings, setShowSettings] = useState(false);
  const [editFocus, setEditFocus] = useState("25");
  const [editBreak, setEditBreak] = useState("5");
  const [editTarget, setEditTarget] = useState("4");

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
      interval.current = setInterval(() => {
        setTimer((t) => {
          const next = { ...t, timeLeft: t.timeLeft - 1 };
          if (next.timeLeft <= 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            next.running = false;
            incrementActivity({ variables: { date: new Date().toISOString().split("T")[0] } }).catch(() => {});
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
  const dashOffset = CIRC * (1 - progress);
  const minutes = Math.floor(timer.timeLeft / 60);
  const secs = timer.timeLeft % 60;
  const timerLabel = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Timer</Text>
        <IconButton icon="cog" onPress={openSettings} accessibilityLabel="Timer settings" />
      </View>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => { setTimer((t) => ({ ...t, phase: "focus", timeLeft: t.focusDuration, running: false })); }}
          style={[styles.modeChip, { backgroundColor: timer.phase === "focus" ? brand.primary : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.lg }]}
        >
          <Text style={{ color: timer.phase === "focus" ? "#fff" : paperTheme.colors.onSurface, fontWeight: "600", fontSize: 13 }}>Focus</Text>
        </Pressable>
        <Pressable
          onPress={() => { setTimer((t) => ({ ...t, phase: "break", timeLeft: t.breakDuration, running: false })); }}
          style={[styles.modeChip, { backgroundColor: timer.phase === "break" ? brand.primary : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.lg }]}
        >
          <Text style={{ color: timer.phase === "break" ? "#fff" : paperTheme.colors.onSurface, fontWeight: "600", fontSize: 13 }}>Break</Text>
        </Pressable>
      </View>

      <View style={styles.sessionRow}>
        <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
          Sessions: {timer.sessionsCompleted}/{timer.sessionTarget}
        </Text>
        <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
          {Math.round(timer.focusDuration / 60)}m / {Math.round(timer.breakDuration / 60)}m
        </Text>
      </View>

      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={CX} cy={CY} r={R} stroke={paperTheme.colors.surfaceVariant} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={CX} cy={CY} r={R} stroke={brand.primary} strokeWidth={STROKE} fill="none"
            strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={dashOffset}
            strokeLinecap="round" transform={`rotate(-90 ${CX} ${CY})`}
          />
        </Svg>
        <View style={styles.timeOverlay}>
          <Text style={[styles.timeText, { color: paperTheme.colors.onSurface }]}>{timerLabel}</Text>
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={reset} style={({ pressed }) => [styles.ctrlBtn, pressed && { opacity: 0.7 }]}>
          <Text style={{ color: paperTheme.colors.onSurfaceVariant, fontSize: 12, fontWeight: "600" }}>Reset</Text>
        </Pressable>
        <Pressable
          onPress={toggle}
          style={({ pressed }) => [styles.startBtn, { backgroundColor: brand.primary, borderRadius: SHAPE.lg }, pressed && { opacity: 0.8 }]}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{timer.running ? "Pause" : "Start"}</Text>
        </Pressable>
        <Pressable onPress={skip} style={({ pressed }) => [styles.ctrlBtn, pressed && { opacity: 0.7 }]}>
          <Text style={{ color: paperTheme.colors.onSurfaceVariant, fontSize: 12, fontWeight: "600" }}>Skip</Text>
        </Pressable>
      </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, alignSelf: "stretch" },
  modeRow: { flexDirection: "row", gap: 8, marginTop: 20, marginBottom: 8 },
  modeChip: { paddingHorizontal: 24, paddingVertical: 10 },
  sessionRow: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 16 },
  ringWrap: { alignItems: "center", justifyContent: "center", marginVertical: 20, width: SIZE, height: SIZE },
  timeOverlay: { position: "absolute", alignItems: "center", justifyContent: "center" },
  timeText: { fontSize: 48, fontWeight: "800", fontVariant: ["tabular-nums"] },
  controls: { flexDirection: "row", alignItems: "center", gap: 24, marginTop: 24 },
  ctrlBtn: { width: 48, height: 48, borderRadius: SHAPE.lg, alignItems: "center", justifyContent: "center" },
  startBtn: { width: 140, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  modal: { margin: 20, padding: 24, borderRadius: 26 },
});

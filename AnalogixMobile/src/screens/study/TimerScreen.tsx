import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, useTheme, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const SIZE = 240;
const STROKE = 8;
const R = (SIZE - STROKE) / 2 - 4;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRC = 2 * Math.PI * R;

export default function TimerScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const navigation = useNavigation();
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [seconds, setSeconds] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = mode === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;
  const progress = 1 - seconds / total;
  const dashOffset = CIRC * (1 - progress);

  useEffect(() => {
    if (running) {
      interval.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (mode === "focus") {
              setMode("break");
              return BREAK_SECONDS;
            } else {
              setMode("focus");
              return FOCUS_SECONDS;
            }
          }
          return s - 1;
        });
      }, 1000);
    } else if (interval.current) {
      clearInterval(interval.current);
    }
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [running, mode]);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(!running);
  };

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRunning(false);
    setMode("focus");
    setSeconds(FOCUS_SECONDS);
  };

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Timer</Text>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => { setMode("focus"); setSeconds(FOCUS_SECONDS); setRunning(false); }}
          style={[styles.modeChip, { backgroundColor: mode === "focus" ? brand.primary : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.lg }]}
          accessibilityLabel="Focus mode"
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "focus" }}
        >
          <Text style={{ color: mode === "focus" ? "#fff" : paperTheme.colors.onSurface, fontWeight: "600", fontSize: 13 }}>Focus</Text>
        </Pressable>
        <Pressable
          onPress={() => { setMode("break"); setSeconds(BREAK_SECONDS); setRunning(false); }}
          style={[styles.modeChip, { backgroundColor: mode === "break" ? brand.primary : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.lg }]}
          accessibilityLabel="Break mode"
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "break" }}
        >
          <Text style={{ color: mode === "break" ? "#fff" : paperTheme.colors.onSurface, fontWeight: "600", fontSize: 13 }}>Break</Text>
        </Pressable>
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
          <Text style={[styles.timeText, { color: paperTheme.colors.onSurface }]}>
            {String(minutes).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </Text>
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={reset} style={({ pressed }) => [styles.ctrlBtn, pressed && { opacity: 0.7 }]} accessibilityLabel="Reset timer" accessibilityRole="button">
          <Text style={{ color: paperTheme.colors.onSurfaceVariant, fontSize: 12, fontWeight: "600" }}>Reset</Text>
        </Pressable>
        <Pressable
          onPress={toggle}
          style={({ pressed }) => [styles.startBtn, { backgroundColor: brand.primary, borderRadius: SHAPE.lg }, pressed && { opacity: 0.8 }]}
          accessibilityLabel={running ? "Pause timer" : "Start timer"}
          accessibilityRole="button"
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{running ? "Pause" : "Start"}</Text>
        </Pressable>
        <View style={{ width: 48 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, alignSelf: "stretch" },
  modeRow: { flexDirection: "row", gap: 8, marginTop: 20, marginBottom: 24 },
  modeChip: { paddingHorizontal: 24, paddingVertical: 10 },
  ringWrap: { alignItems: "center", justifyContent: "center", marginVertical: 20, width: SIZE, height: SIZE },
  timeOverlay: { position: "absolute", alignItems: "center", justifyContent: "center" },
  timeText: { fontSize: 48, fontWeight: "800", fontVariant: ["tabular-nums"] },
  controls: { flexDirection: "row", alignItems: "center", gap: 24, marginTop: 24 },
  ctrlBtn: { width: 48, height: 48, borderRadius: SHAPE.lg, alignItems: "center", justifyContent: "center" },
  startBtn: { width: 140, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
});

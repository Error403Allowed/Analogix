/**
 * Study Timer — Pomodoro (25 min focus, 5 min break).
 * Local state + haptics + animated SVG progress ring.
 */
import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, useTheme, Button, IconButton } from "react-native-paper";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize } from "../../hooks/useResponsive";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const SIZE = 260;
const STROKE = 10;
const R = (SIZE - STROKE) / 2 - 4;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRC = 2 * Math.PI * R;

export default function TimerScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const size = useScreenSize();
  const isCompact = size === "compact";
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
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
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
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background, paddingTop: isCompact ? 40 : 56 }]}>
      <Text variant={isCompact ? "headlineMedium" : "headlineLarge"} style={styles.title}>Timer</Text>
      <View style={styles.modeRow}>
        <Pressable onPress={() => { setMode("focus"); setSeconds(FOCUS_SECONDS); setRunning(false); }}>
          <Text
            variant="titleMedium"
            style={{
              fontWeight: mode === "focus" ? "900" : "400",
              color: mode === "focus" ? paperTheme.colors.onSurface : paperTheme.colors.onSurfaceVariant,
            }}
          >
            Focus
          </Text>
        </Pressable>
        <Text variant="titleMedium" style={{ color: paperTheme.colors.outline }}>·</Text>
        <Pressable onPress={() => { setMode("break"); setSeconds(BREAK_SECONDS); setRunning(false); }}>
          <Text
            variant="titleMedium"
            style={{
              fontWeight: mode === "break" ? "900" : "400",
              color: mode === "break" ? paperTheme.colors.onSurface : paperTheme.colors.onSurfaceVariant,
            }}
          >
            Break
          </Text>
        </Pressable>
      </View>

      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            stroke={paperTheme.colors.surfaceVariant}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            stroke={brand.primary}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${CIRC} ${CIRC}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        </Svg>
        <View style={styles.timeOverlay}>
          <Text variant="displayLarge" style={{ fontWeight: "900" }}>
            {String(minutes).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <IconButton icon="restart" size={28} onPress={reset} />
        <Button
          mode="contained"
          onPress={toggle}
          buttonColor={brand.primary}
          contentStyle={{ width: 120, height: 56 }}
          style={{ borderRadius: SHAPE.xl }}
        >
          {running ? "Pause" : "Start"}
        </Button>
        <View style={{ width: 28 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: "center" },
  title: { fontWeight: "900", marginBottom: 16 },
  modeRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
  ringWrap: { alignItems: "center", justifyContent: "center", marginVertical: 24, width: SIZE, height: SIZE },
  timeOverlay: { position: "absolute", alignItems: "center", justifyContent: "center" },
  controls: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 24 },
});

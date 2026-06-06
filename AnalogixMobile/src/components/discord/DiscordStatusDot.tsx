import React from "react";
import { View, StyleSheet } from "react-native";
import type { DiscordStatusDotProps } from "./types";

const STATUS_COLORS = {
  online: "#23a55a",
  idle: "#f0b232",
  dnd: "#da373c",
  offline: "#80848e",
};

export default function DiscordStatusDot({
  status,
  size = 10,
}: DiscordStatusDotProps) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.offline;

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: size > 8 ? 2 : 1,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderColor: "#fff",
  },
});

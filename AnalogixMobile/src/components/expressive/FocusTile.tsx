import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import Icon from "../Icon";
import { SHAPE } from "../../theme/tokens";

interface FocusTileProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  onPress?: () => void;
  size?: "small" | "large";
}

export function FocusTile({ label, value, icon, color = "#fff", onPress, size = "small" }: FocusTileProps) {
  const isLarge = size === "large";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: "rgba(255,255,255,0.15)",
          borderRadius: SHAPE.lg,
          flex: isLarge ? 2 : 1,
          minHeight: isLarge ? 110 : 80,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Icon name={icon} size={isLarge ? 20 : 18} color={color} />
      <Text
        style={[styles.value, { color, fontSize: isLarge ? 26 : 20 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text variant="labelSmall" style={[styles.label, { color: "rgba(255,255,255,0.7)" }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    padding: 10,
    justifyContent: "center",
    gap: 2,
  },
  value: {
    fontWeight: "700",
  },
  label: {
    fontWeight: "500",
    marginTop: -2,
  },
});

import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import Icon from "../Icon";
import type { DiscordPillProps } from "./types";

export default function DiscordPill({
  icon,
  color,
  active,
  onPress,
  size = 48,
  label,
}: DiscordPillProps) {
  const theme = useTheme();

  const pill = (
    <View
      style={[
        styles.pill,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active ? color : theme.colors.surfaceVariant,
        },
        active && {
          borderWidth: 0,
        },
        !active && {
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <Icon
        name={icon}
        size={size * 0.42}
        color={active ? "#fff" : theme.colors.onSurfaceVariant}
      />
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.wrapper,
          pressed && { opacity: 0.8 },
        ]}
      >
        {pill}
        {label && (
          <View style={styles.labelWrap}>
            <Icon name={label} size={24} color={theme.colors.onSurface} />
          </View>
        )}
      </Pressable>
    );
  }

  return pill;
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 4,
  },
  pill: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelWrap: {
    marginTop: 2,
  },
});

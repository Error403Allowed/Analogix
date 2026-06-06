import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Icon from "../Icon";
import { SHAPE } from "../../theme/tokens";
import { SPACE } from "../../theme/spacing";
import type { DiscordChannelItemProps } from "./types";

export default function DiscordChannelItem({
  name,
  type = "text",
  unread,
  active,
  onPress,
  mentionCount,
}: DiscordChannelItemProps) {
  const theme = useTheme();

  const prefixIcon = type === "voice" ? "volume-high" : "pound";
  const prefixColor = active
    ? theme.colors.onSurface
    : theme.colors.onSurfaceVariant;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        active && { backgroundColor: theme.colors.surfaceVariant },
        pressed && !active && { backgroundColor: theme.colors.surfaceVariant + "66" },
      ]}
    >
      <Icon name={prefixIcon} size={18} color={prefixColor} />
      <Text
        style={[
          styles.name,
          { color: prefixColor },
          unread || mentionCount ? { fontWeight: "600", color: theme.colors.onSurface } : undefined,
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      {mentionCount ? (
        <View style={[styles.mentionBadge, { backgroundColor: theme.colors.error }]}>
          <Text style={styles.mentionText}>{mentionCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: SPACE.lg,
    gap: 8,
    borderRadius: SHAPE.xs,
  },
  name: {
    fontSize: 15,
    fontWeight: "400",
    flex: 1,
  },
  mentionBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  mentionText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});

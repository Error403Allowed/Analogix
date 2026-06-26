import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import DiscordAvatar from "./DiscordAvatar";
import { SPACE } from "../../theme/spacing";
import type { DiscordMessageProps } from "./types";

export default function DiscordMessage({
  avatar,
  name,
  nameColor,
  timestamp,
  text,
  streaming,
}: DiscordMessageProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.avatarCol}>
        <DiscordAvatar
          uri={avatar?.uri}
          fallback={avatar?.fallback ?? name.charAt(0).toUpperCase()}
          size={32}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.name,
              { color: nameColor ?? theme.colors.primary },
            ]}
          >
            {name}
          </Text>
          <Text style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]}>
            {timestamp}
          </Text>
        </View>
        <Text
          style={[styles.body, { color: theme.colors.onSurface }]}
          selectable
        >
          {text}
          {streaming && <Text style={styles.cursor}>{" ▍"}</Text>}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.xs,
  },
  avatarCol: {
    width: 32,
    marginRight: SPACE.md,
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 11,
    fontWeight: "400",
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
    marginTop: 2,
  },
  cursor: {
    opacity: 0.5,
  },
});

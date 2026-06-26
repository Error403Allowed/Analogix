import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Icon from "../Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DiscordHeaderProps } from "./types";

export default function DiscordHeader({
  title,
  subtitle,
  onBack,
  right,
  channelPrefix = true,
}: DiscordHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.elevation.level0,
          borderBottomColor: theme.colors.outlineVariant,
          paddingTop: insets.top + 8,
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.left}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
              <Icon name="arrow-left" size={20} color={theme.colors.onSurface} />
            </Pressable>
          )}
          <View style={styles.titleArea}>
            <View style={styles.titleRow}>
              {channelPrefix && (
                <Text style={[styles.hash, { color: theme.colors.primary }]}>#</Text>
              )}
              <Text
                style={[styles.title, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>
            {subtitle && (
              <Text
                style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {right && <View style={styles.right}>{right}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backBtn: {
    marginRight: 8,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  titleArea: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hash: {
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

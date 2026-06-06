import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Icon from "../Icon";
import DiscordAvatar from "./DiscordAvatar";
import DiscordDivider from "./DiscordDivider";
import { SHAPE } from "../../theme/tokens";
import { SPACE } from "../../theme/spacing";
import type { DiscordListItemProps } from "./types";

export default function DiscordListItem({
  icon,
  iconColor,
  avatar,
  title,
  subtitle,
  right,
  time,
  onPress,
  unread,
  selected,
}: DiscordListItemProps) {
  const theme = useTheme();

  const content = (
    <View style={styles.row}>
      {unread && (
        <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
      )}
      {avatar ? (
        <DiscordAvatar uri={avatar.uri} fallback={avatar.fallback} size={40} />
      ) : icon ? (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: iconColor ? `${iconColor}18` : theme.colors.surfaceVariant },
          ]}
        >
          <Icon
            name={icon}
            size={20}
            color={iconColor ?? theme.colors.onSurfaceVariant}
          />
        </View>
      ) : null}
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              { color: theme.colors.onSurface },
              unread && { fontWeight: "700" },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {time && (
            <Text style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>
              {time}
            </Text>
          )}
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
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );

  return (
    <View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.container,
          selected && { backgroundColor: theme.colors.surfaceVariant },
          pressed && { opacity: 0.85 },
        ]}
      >
        {content}
      </Pressable>
      <DiscordDivider />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    minHeight: 44,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -12,
    position: "absolute",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: SHAPE.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  time: {
    fontSize: 11,
    fontWeight: "400",
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
  },
  right: {},
});

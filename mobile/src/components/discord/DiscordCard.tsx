import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { SHAPE } from "../../theme/tokens";
import { SPACE } from "../../theme/spacing";
import type { DiscordCardProps } from "./types";

export default function DiscordCard({
  children,
  onPress,
  style,
  padding = SPACE.md,
}: DiscordCardProps) {
  const theme = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      padding,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyle,
          pressed && { opacity: 0.85 },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: SHAPE.xs,
  },
});

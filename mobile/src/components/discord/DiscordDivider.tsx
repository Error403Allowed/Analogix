import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

export default function DiscordDivider() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: theme.colors.outlineVariant },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
  },
});

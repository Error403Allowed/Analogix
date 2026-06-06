import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import DiscordStatusDot from "./DiscordStatusDot";
import type { DiscordAvatarProps } from "./types";

export default function DiscordAvatar({
  uri,
  fallback,
  size = 32,
  status,
}: DiscordAvatarProps) {
  const theme = useTheme();
  const dotSize = Math.max(8, size * 0.3);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.colors.primary,
            },
          ]}
        >
          <Text
            style={[styles.fallbackText, { fontSize: size * 0.42, color: "#fff" }]}
          >
            {fallback.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      {status && (
        <View style={[styles.dotWrap, { bottom: 0, right: 0 }]}>
          <DiscordStatusDot status={status} size={dotSize} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    resizeMode: "cover",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontWeight: "700",
  },
  dotWrap: {
    position: "absolute",
  },
});

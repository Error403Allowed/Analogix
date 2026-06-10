import React, { useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Icon from "../Icon";
import { SHAPE, MOTION } from "../../theme/tokens";

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
  const scale = useSharedValue(1);

  const pressIn = useCallback(() => {
    scale.value = withSpring(0.95, MOTION.tap);
  }, [scale]);

  const pressOut = useCallback(() => {
    scale.value = withSpring(1, MOTION.tap);
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animStyle, { flex: isLarge ? 2 : 1 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={({ pressed }) => [
          styles.tile,
          {
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: SHAPE.lg,
            minHeight: isLarge ? 110 : 80,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Icon name={icon} size={isLarge ? 22 : 18} color={color} />
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    padding: 12,
    justifyContent: "center",
    gap: 3,
  },
  value: {
    fontWeight: "700",
  },
  label: {
    fontWeight: "500",
    marginTop: -2,
  },
});

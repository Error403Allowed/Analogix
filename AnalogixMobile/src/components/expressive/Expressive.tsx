import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Text, useTheme, type MD3Theme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Icon from "../Icon";
import { MOTION, SHAPE } from "../../theme/tokens";

type ExpressiveColorRole =
  | "surfaceContainerLowest"
  | "surfaceContainerLow"
  | "surfaceContainer"
  | "surfaceContainerHigh"
  | "surfaceContainerHighest"
  | "surfaceBright"
  | "surfaceDim";

type ExpressiveColors = MD3Theme["colors"] & Record<ExpressiveColorRole, string>;

function colors(theme: MD3Theme): ExpressiveColors {
  return theme.colors as ExpressiveColors;
}

type PressableScaleProps = {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link" | "none";
};

/**
 * PressableScale — Animated.View is the OUTER element so flex / explicit-width
 * styles work correctly inside any flex container. The Pressable sits as an
 * absolute-fill overlay so the full card area is tappable.
 */
export function PressableScale({
  children,
  onPress,
  style,
  disabled,
  accessibilityLabel,
  accessibilityRole,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        style={StyleSheet.absoluteFillObject}
        disabled={disabled || !onPress}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole ?? (onPress ? "button" : "none")}
        onPressIn={() => { scale.value = withSpring(0.975, MOTION.tap); }}
        onPressOut={() => { scale.value = withSpring(1, MOTION.tap); }}
      />
      {children}
    </Animated.View>
  );
}

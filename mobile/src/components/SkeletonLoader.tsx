import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { useTheme } from "react-native-paper";
import { SHAPE } from "../theme/tokens";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = SHAPE.xs, style }: SkeletonProps) {
  const paperTheme = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: paperTheme.colors.surfaceVariant, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: any }) {
  const paperTheme = useTheme();
  return (
    <View style={[{ backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg, padding: 16, gap: 10 }, style]}>
      <Skeleton width="60%" height={14} />
      <Skeleton width="100%" height={12} />
      <Skeleton width="80%" height={12} />
      <Skeleton width="40%" height={10} />
    </View>
  );
}

export function SkeletonList({ count = 4, style }: { count?: number; style?: any }) {
  return (
    <View style={[{ gap: 12 }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

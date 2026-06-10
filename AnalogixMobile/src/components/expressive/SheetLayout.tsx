import React, { useCallback } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { SHAPE, MOTION } from "../../theme/tokens";

interface SheetLayoutProps {
  heroColor: string;
  heroContent: React.ReactNode;
  heroMinHeight?: number;
  children: React.ReactNode;
  refreshControl?: React.ReactElement;
}

export function SheetLayout({ heroColor, heroContent, heroMinHeight = 240, children, refreshControl }: SheetLayoutProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const collapsedH = 60;

  const heroHeight = useDerivedValue(() =>
    interpolate(
      scrollY.value,
      [0, heroMinHeight - collapsedH],
      [heroMinHeight, collapsedH],
      Extrapolation.CLAMP,
    )
  );

  const heroOpacity = useDerivedValue(() =>
    interpolate(
      scrollY.value,
      [0, heroMinHeight - 80],
      [1, 0],
      Extrapolation.CLAMP,
    )
  );

  const heroAnimStyle = useAnimatedStyle(() => ({
    height: heroHeight.value,
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
  }));

  const onScroll = useCallback((event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }, [scrollY]);

  return (
    <View style={[styles.root, { backgroundColor: heroColor }]}>
      <Animated.View
        style={[
          styles.hero,
          heroAnimStyle,
          {
            backgroundColor: heroColor,
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <Animated.View style={[contentAnimStyle, { flex: 1 }]}>
          {heroContent}
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.sheet}
        contentContainerStyle={[
          styles.sheetContent,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        refreshControl={refreshControl as any}
        onScroll={onScroll}
      >
        <View
          style={[
            styles.cardLayer,
            {
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: SHAPE.xl,
              borderTopRightRadius: SHAPE.xl,
              minHeight: screenH - heroMinHeight + 60,
            },
          ]}
        >
          {children}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 0,
  },
  sheet: {
    flex: 1,
    zIndex: 1,
  },
  sheetContent: {
    paddingTop: 140,
  },
  cardLayer: {
    padding: 16,
    paddingTop: 20,
  },
});

import React, { useRef } from "react";
import { View, StyleSheet, Animated as RNAnimated, useWindowDimensions } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SHAPE } from "../../theme/tokens";

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
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const heroHeight = scrollY.interpolate({
    inputRange: [0, heroMinHeight - 60],
    outputRange: [heroMinHeight, 60],
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, heroMinHeight - 80],
    outputRange: [1, 0],
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <View style={[styles.root, { backgroundColor: heroColor }]}>
      <RNAnimated.View
        style={[
          styles.hero,
          {
            height: heroHeight,
            backgroundColor: heroColor,
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <RNAnimated.View style={{ opacity: heroOpacity, flex: 1 }}>
          {heroContent}
        </RNAnimated.View>
      </RNAnimated.View>

      <RNAnimated.ScrollView
        style={styles.sheet}
        contentContainerStyle={[
          styles.sheetContent,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        refreshControl={refreshControl as any}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
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
      </RNAnimated.ScrollView>
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

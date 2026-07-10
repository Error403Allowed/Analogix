import React, { useEffect, useCallback, useRef } from "react";
import { Pressable, StyleSheet, View, LayoutChangeEvent, Platform } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SHAPE } from "../theme/tokens";
import Icon from "../components/Icon";

const TAB_CONFIG: Record<string, { icon: string; iconOutline: string; label: string }> = {
  Home:     { icon: "home-variant",         iconOutline: "home-variant-outline",         label: "Home" },
  Tutor:    { icon: "message-text",         iconOutline: "message-text-outline",         label: "Tutor" },
  Study:    { icon: "book-open-variant",    iconOutline: "book-open-variant-outline",    label: "Study" },
  Subjects: { icon: "school",              iconOutline: "school-outline",               label: "Subjects" },
  Rooms:    { icon: "account-group",       iconOutline: "account-group-outline",        label: "Rooms" },
  Profile:  { icon: "account-circle",      iconOutline: "account-circle-outline",       label: "Profile" },
};

export function MaterialTabBar(props: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const colors = theme.colors as typeof theme.colors & { surfaceContainer: string; surfaceContainerHigh: string };

  const indicatorX = useSharedValue(0);
  const tabPositions = useRef<number[]>([]);

  const onTabLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    const x = event.nativeEvent.layout.x;
    tabPositions.current[index] = x;
    if (index === props.state.index) {
      indicatorX.value = x;
    }
  }, [props.state.index, indicatorX]);

  useEffect(() => {
    const positions = tabPositions.current;
    if (positions.length > props.state.index) {
      const targetX = positions[props.state.index] ?? 0;
      indicatorX.value = withSpring(targetX, { damping: 22, stiffness: 260, mass: 0.6 });
    }
  }, [props.state.index, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: insets.bottom + 4,
          backgroundColor: colors.surfaceContainer ?? theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
      ]}
    >
      {props.state.routes.map((route, index) => {
        const focused = props.state.index === index;
        const config = TAB_CONFIG[route.name] ?? { icon: "circle", iconOutline: "circle", label: route.name };
        const onPress = () => {
          const event = props.navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            props.navigation.navigate(route.name);
            if (Platform.OS === "ios") {
              try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const haptics = require("expo-haptics");
                haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
              } catch { /* haptics unavailable */ }
            }
          }
        };
        return (
          <TabItem
            key={route.key}
            focused={focused}
            config={config}
            theme={theme}
            onPress={onPress}
            onLayout={(e) => onTabLayout(index, e)}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  focused, config, theme, onPress, onLayout,
}: {
  focused: boolean;
  config: { icon: string; iconOutline: string; label: string };
  theme: any;
  onPress: () => void;
  onLayout: (e: any) => void;
}) {
  const iconScale = useSharedValue(1);
  const labelOpacity = useSharedValue(focused ? 1 : 0.8);

  useEffect(() => {
    iconScale.value = withSpring(focused ? 1.1 : 1, { damping: 14, stiffness: 180 });
    labelOpacity.value = withTiming(focused ? 1 : 0.8, { duration: 150 });
  }, [focused, iconScale, labelOpacity]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));
  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }, styles.tab]}
    >
      <View style={[styles.activeBg, focused && { backgroundColor: theme.colors.primary + "22", borderRadius: SHAPE.pill }]}>
        <Animated.View style={iconAnimStyle}>
          <Icon
            name={focused ? config.icon : config.iconOutline}
            size={24}
            color={focused ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
        </Animated.View>
      </View>
      <Animated.View style={labelAnimStyle}>
        <Text
          variant="labelSmall"
          style={{
            color: focused ? theme.colors.primary : theme.colors.onSurfaceVariant,
            fontWeight: focused ? "700" : "500",
            fontSize: 11,
            marginTop: 1,
          }}
        >
          {config.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  activeBg: {
    width: 56,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});

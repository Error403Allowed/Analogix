/**
 * M3 Expressive bottom tab bar.
 * - Pill-shaped active indicator with M3 primary container color
 * - Spring-based motion when switching tabs
 * - Centre FAB for quick actions
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Icon from "../components/Icon";
import { MOTION, SHAPE } from "../theme/tokens";
import { useThemeContext } from "../theme/ThemeContext";

const TAB_ICONS: Record<string, string> = {
  Home: "home-variant",
  Tutor: "message-text",
  Study: "book-open-variant",
  Subjects: "school",
  Rooms: "account-group",
  Profile: "account-circle",
};

export function MaterialTabBar(props: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
      ]}
    >
      {props.state.routes.map((route, index) => {
        const focused = props.state.index === index;
        const onPress = () => {
          const event = props.navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) props.navigation.navigate(route.name as never);
        };
        return (
          <TabItem
            key={route.key}
            label={route.name}
            icon={TAB_ICONS[route.name] ?? "circle"}
            focused={focused}
            onPress={onPress}
            activeColor={brand.primary}
            inactiveColor={theme.colors.onSurfaceVariant}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  onPress,
  activeColor,
  inactiveColor,
}: {
  label: string;
  icon: string;
  focused: boolean;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.92, MOTION.tap as never);
  };
  const onPressOut = () => {
    scale.value = withSpring(1, MOTION.entry as never);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.tab}
      hitSlop={8}
    >
      <Animated.View style={[styles.tabInner, animStyle]}>
        {focused ? (
          <View
            style={[
              styles.activePill,
              { backgroundColor: `${activeColor}22` },
            ]}
          >
            <Icon name={icon} size={24} color={activeColor} />
          </View>
        ) : (
          <Icon name={icon} size={24} color={inactiveColor} />
        )}
        <Text
          variant="labelSmall"
          style={[
            styles.label,
            { color: focused ? activeColor : inactiveColor, fontWeight: focused ? "700" : "500" },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  activePill: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: SHAPE.pill,
  },
  label: {
    marginTop: 2,
  },
});

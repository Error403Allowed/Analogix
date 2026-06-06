import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
        const config = TAB_CONFIG[route.name] ?? { icon: "circle", label: route.name };
        const onPress = () => {
          const event = props.navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            props.navigation.navigate(route.name);
          }
        };
        return (
          <TabItem
            key={route.key}
            focused={focused}
            config={config}
            theme={theme}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

function TabItem({ focused, config, theme, onPress }: { focused: boolean; config: { icon: string; iconOutline: string; label: string }; theme: any; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      scale.setValue(1.08);
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [focused, scale]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }, styles.tab]}>
      <Animated.View style={[styles.activeBg, focused && { backgroundColor: theme.colors.secondaryContainer, borderRadius: SHAPE.pill }, { transform: [{ scale }] }]}>
        <Icon
          name={focused ? config.icon : config.iconOutline}
          size={24}
          color={focused ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant}
        />
      </Animated.View>
      <Text
        variant="labelSmall"
        style={{
          color: focused ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
          fontWeight: focused ? "700" : "500",
          fontSize: 12,
          marginTop: 2,
        }}
      >
        {config.label}
      </Text>
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
  },
  activeBg: {
    width: 64,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});

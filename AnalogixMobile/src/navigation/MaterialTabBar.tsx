import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SHAPE } from "../theme/tokens";
import Icon from "../components/Icon";

const TAB_CONFIG: Record<string, { icon: string; label: string }> = {
  Home: { icon: "home-variant", label: "Home" },
  Tutor: { icon: "message-text", label: "Tutor" },
  Study: { icon: "book-open-variant", label: "Study" },
  Subjects: { icon: "school", label: "Subjects" },
  Rooms: { icon: "account-group", label: "Rooms" },
  Profile: { icon: "account-circle", label: "Profile" },
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
          <Pressable
            key={route.key}
            onPress={onPress}
            style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, styles.tab]}
          >
            <View style={[styles.activeBg, focused && { backgroundColor: theme.colors.secondaryContainer, borderRadius: SHAPE.pill }]}>
              <Icon
                name={config.icon}
                size={24}
                color={focused ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant}
              />
            </View>
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
      })}
    </View>
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

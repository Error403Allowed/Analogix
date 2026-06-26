import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, LayoutChangeEvent, Platform } from "react-native";
import { useTheme } from "react-native-paper";
import { useThemeContext } from "../../theme/ThemeContext";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import Icon from "../Icon";
import { MOTION } from "../../theme/tokens";

interface TabConfig {
  name: string;
  icon: string;
  label: string;
}

interface ShortNavBarProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabPress: (name: string) => void;
  onFabPress: () => void;
}

const FAB_SIZE = 52;

export function ShortNavBar({ tabs, activeTab, onTabPress, onFabPress }: ShortNavBarProps) {
  const theme = useTheme();
  const { brand } = useThemeContext();
  const fabScale = useSharedValue(1);

  const handleFabPressIn = useCallback(() => {
    fabScale.value = withSpring(0.92, MOTION.tap);
    if (Platform.OS === "ios") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const haptics = require("expo-haptics");
        haptics.impactAsync(haptics.ImpactFeedbackStyle.Medium);
      } catch { /* haptics unavailable */ }
    }
  }, [fabScale]);

  const handleFabPressOut = useCallback(() => {
    fabScale.value = withSpring(1, MOTION.tap);
  }, [fabScale]);

  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.nav,
          {
            backgroundColor: theme.dark ? "#1E1E2E" : "#FFFFFF",
            borderRadius: 9999,
            borderWidth: 1,
            borderColor: theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            boxShadow: `0px 6px 16px rgba(0,0,0,${theme.dark ? 0.3 : 0.12})`,
            elevation: 10,
          },
        ]}
      >
        {tabs.map((tab) => {
          const focused = tab.name === activeTab;
          return (
            <Pressable
              key={tab.name}
              onPress={() => onTabPress(tab.name)}
              style={({ pressed }) => [
                styles.tab,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <NavTabItem icon={tab.icon} focused={focused} brand={brand} theme={theme} />
            </Pressable>
          );
        })}
      </View>

      <Animated.View style={fabAnimStyle}>
        <Pressable
          onPress={onFabPress}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          style={[
            styles.fab,
            {
              backgroundColor: brand.primary,
              width: FAB_SIZE,
              height: FAB_SIZE,
              borderRadius: FAB_SIZE / 2,
              boxShadow: `0px 4px 8px ${brand.primary}4D`,
              elevation: 6,
            },
          ]}
        >
          <Icon name="message-text" size={24} color="#fff" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function NavTabItem({ icon, focused, brand }: { icon: string; focused: boolean; brand: any; theme: any }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, { damping: 14, stiffness: 200 });
  }, [focused, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.tabInner,
        focused && {
          backgroundColor: `${brand.primary}16`,
          borderRadius: 9999,
        },
        focused ? animStyle : undefined,
      ]}
    >
      <Icon
        name={icon}
        size={22}
        color={focused ? brand.primary : "#999"}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    alignItems: "center",
    justifyContent: "center",
  },
});

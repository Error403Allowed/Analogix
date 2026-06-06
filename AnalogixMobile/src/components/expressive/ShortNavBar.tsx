import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTheme } from "react-native-paper";
import { useThemeContext } from "../../theme/ThemeContext";
import Icon from "../Icon";

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
            shadowColor: "#000",
            shadowOpacity: theme.dark ? 0.3 : 0.12,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 16,
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
              <View
                style={[
                  styles.tabInner,
                  focused && {
                    backgroundColor: `${brand.primary}16`,
                    borderRadius: 9999,
                  },
                ]}
              >
                <Icon
                  name={tab.icon}
                  size={22}
                  color={focused ? brand.primary : theme.colors.onSurfaceVariant}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onFabPress}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: brand.primary,
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: FAB_SIZE / 2,
            opacity: pressed ? 0.85 : 1,
            shadowColor: brand.primary,
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 6,
          },
        ]}
      >
        <Icon name="message-text" size={24} color="#fff" />
      </Pressable>
    </View>
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

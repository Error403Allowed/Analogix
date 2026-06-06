import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { SHAPE, MOTION } from "../../theme/tokens";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

interface ToolbarOption {
  label: string;
  value: string;
  icon?: string;
}

interface FloatingToolbarProps {
  options: ToolbarOption[];
  selected: string;
  onSelect: (value: string) => void;
}

export function FloatingToolbar({ options, selected, onSelect }: FloatingToolbarProps) {
  const theme = useTheme();
  return (
    <View style={[styles.toolbar, { backgroundColor: theme.colors.surfaceVariant, borderRadius: SHAPE.pill }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {options.map((opt) => {
          const isSelected = opt.value === selected;
          return (
            <Pressable key={opt.value} onPress={() => onSelect(opt.value)}>
              <ToolbarButton label={opt.label} selected={isSelected} color={theme.colors.primary} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ToolbarButton({ label, selected, color }: { label: string; selected: boolean; color: string }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.btn,
        selected
          ? { backgroundColor: color, borderRadius: SHAPE.pill }
          : { borderRadius: SHAPE.pill },
        animStyle,
      ]}
    >
      <Text
        variant="labelMedium"
        style={{
          color: selected ? "#fff" : color,
          fontWeight: selected ? "800" : "600",
        }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    padding: 4,
    alignSelf: "center",
    marginBottom: 16,
  },
  scroll: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 2,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});

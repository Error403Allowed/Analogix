import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView, LayoutChangeEvent } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { SHAPE, MOTION } from "../../theme/tokens";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from "react-native-reanimated";

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
  const indicatorX = useSharedValue(0);
  const optionWidths = useSharedValue<number[]>([]);

  const onOptionLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    const x = event.nativeEvent.layout.x;
    optionWidths.value = [...optionWidths.value.slice(0, index), x, ...optionWidths.value.slice(index + 1)];
    if (options[index]?.value === selected) {
      indicatorX.value = x;
    }
  }, [selected, options, indicatorX, optionWidths]);

  useEffect(() => {
    const idx = options.findIndex((o) => o.value === selected);
    if (idx >= 0 && optionWidths.value.length > idx) {
      indicatorX.value = withSpring(optionWidths.value[idx] ?? 0, { damping: 22, stiffness: 260, mass: 0.5 });
    }
  }, [selected, options, optionWidths.value, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={[styles.toolbar, { backgroundColor: theme.colors.surfaceVariant, borderRadius: SHAPE.pill }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {options.map((opt, index) => {
          const isSelected = opt.value === selected;
          return (
            <Pressable key={opt.value} onPress={() => onSelect(opt.value)} onLayout={(e) => onOptionLayout(index, e)}>
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

  useEffect(() => {
    scale.value = withSpring(selected ? 1.05 : 1, { damping: 14, stiffness: 180 });
  }, [selected, scale]);

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
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
});

import React, { useState, useRef } from "react";
import { View, Pressable, StyleSheet, Animated } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Props {
  content: string;
}

export function ThinkingBlock({ content }: Props) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const theme = useTheme();
  const c = theme.colors as any;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.timing(anim, {
      toValue,
      duration: 180,
      useNativeDriver: false,
    }).start();
    setOpen(!open);
  };

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  return (
    <View style={styles.container}>
      <Pressable onPress={toggle} style={styles.toggle}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <View style={styles.chevron}>
            <View style={[styles.chevronLine, { backgroundColor: c.onSurfaceVariant + "80" }]} />
            <View style={[styles.chevronLine, { backgroundColor: c.onSurfaceVariant + "80" }]} />
          </View>
        </Animated.View>
        <Text style={[styles.label, { color: c.onSurfaceVariant + "80" }]}>
          {open ? "Hide thinking" : "Show thinking"}
        </Text>
      </Pressable>
      {open && (
        <View style={[styles.body, { borderLeftColor: c.outlineVariant ?? "#ddd" }]}>
          <View style={{ opacity: 0.55 }}>
            <MarkdownRenderer content={content} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    marginBottom: 4,
  },
  chevron: {
    width: 10,
    height: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  chevronLine: {
    position: "absolute",
    width: 7,
    height: 1.5,
    borderRadius: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  body: {
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
});

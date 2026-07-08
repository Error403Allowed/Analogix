import React, { useState } from "react";
import { View, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MarkdownRenderer } from "./MarkdownRenderer";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  content: string;
}

export function ThinkingBlock({ content }: Props) {
  const [open, setOpen] = useState(false);
  const paperTheme = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        style={styles.toggle}
        hitSlop={8}
      >
        <Text style={[styles.arrow, { color: paperTheme.colors.onSurfaceVariant + "80" }]}>
          {open ? "▾" : "▸"}
        </Text>
        <Text style={[styles.label, { color: paperTheme.colors.onSurfaceVariant + "80" }]}>
          {open ? "Hide thinking" : "Show thinking"}
        </Text>
      </Pressable>
      {open && (
        <View style={[styles.body, { borderLeftColor: paperTheme.colors.outlineVariant }]}>
          <View style={styles.content}>
            <MarkdownRenderer content={content} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  arrow: { fontSize: 12 },
  label: { fontSize: 11, fontWeight: "500", letterSpacing: 0.5 },
  body: { borderLeftWidth: 2, paddingLeft: 10, overflow: "hidden" },
  content: { opacity: 0.65 },
});

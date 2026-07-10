import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { parseThinkingBlock } from "../../../utils/parseThinkingBlock";
import { ThinkingBlock } from "../../../components/ThinkingBlock";
import { MarkdownWithGraphs } from "./MarkdownWithGraphs";

export function StreamingMessage({ content, onRunCode }: { content: string; onRunCode?: (code: string) => void }) {
  const theme = useTheme();
  const parsed = parseThinkingBlock(content, false);
  return (
    <View style={styles.container}>
      {parsed.thinking && <ThinkingBlock content={parsed.thinking} />}
      {parsed.response ? (
        <MarkdownWithGraphs content={parsed.response} onRunCode={onRunCode} />
      ) : null}
      <View style={styles.indicator}>
        <View style={[styles.dot, { backgroundColor: theme.colors.primary }]}>
          <View style={[styles.dotInner, { backgroundColor: theme.colors.primary }]} />
        </View>
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Streaming response...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  indicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotInner: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.4,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
});

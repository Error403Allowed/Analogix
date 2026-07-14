import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { parseThinkingBlock } from "../../../utils/parseThinkingBlock";
import { ThinkingBlock } from "../../../components/ThinkingBlock";
import { MarkdownWithGraphs } from "./MarkdownWithGraphs";
import { ReadAloudButton } from "../../../components/ReadAloudButton";
import { ChatQuickActions } from "../../../components/ChatQuickActions";
import { formatTime } from "../utils/formatTime";
import Icon from "../../../components/Icon";

interface AssistantMessageProps {
  content: string;
  createdAt?: string;
  id: string;
  messages: any[];
  isLastAssistant: boolean;
  hasStreaming: boolean;
  reExplainingId: string | null;
  researchSources: any[];
  sending: boolean;
  onRunCode: (code: string) => void;
  onRegenerate: () => void;
  onReExplainRequest: (messageId: string) => void;
}

export function AssistantMessage({
  content, createdAt, id, messages, isLastAssistant, hasStreaming,
  reExplainingId, researchSources, sending, onRunCode, onRegenerate, onReExplainRequest,
}: AssistantMessageProps) {
  const theme = useTheme();
  const parsed = parseThinkingBlock(content, true);
  const isReExplaining = reExplainingId === id;
  const responseTime = createdAt
    ? (() => {
        const idx = messages.findIndex(m => m.id === id);
        const prev = idx >= 0 && idx < messages.length - 1 ? messages[idx + 1] : null;
        if (prev?.role === "user" && prev.createdAt) {
          return Math.max(1, Math.round(
            (new Date(createdAt).getTime() - new Date(prev.createdAt).getTime()) / 1000,
          ));
        }
        return null;
      })()
    : null;

  return (
    <Pressable onLongPress={() => onReExplainRequest(id)} style={{ marginBottom: 4 }}>
      <View style={styles.msgContent}>
        {parsed.thinking && <ThinkingBlock content={parsed.thinking} />}
        {parsed.response ? (
          <MarkdownWithGraphs content={parsed.response} onRunCode={onRunCode} />
        ) : null}
      </View>
      <View style={styles.actions}>
        <ReadAloudButton text={parsed.response || parsed.thinking || ""} size={15} />
        <Pressable
          onPress={() => onReExplainRequest(id)}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 1 : 0.5 }]}
          accessibilityLabel="Explain differently"
        >
          <Icon name="auto-fix" size={13} color={theme.colors.onSurfaceVariant} />
        </Pressable>
        {isLastAssistant && !hasStreaming && (
          <Pressable
            onPress={onRegenerate}
            disabled={sending}
            style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 1 : 0.5 }]}
          >
            <Icon name="refresh" size={13} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        )}
        {responseTime !== null ? (
          <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
            {responseTime}s
          </Text>
        ) : createdAt ? (
          <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
            {formatTime(createdAt)}
          </Text>
        ) : null}
        {isReExplaining && (
          <ActivityIndicator size={12} color={theme.colors.primary} style={{ marginLeft: 4 }} />
        )}
      </View>
      {researchSources.length > 0 && isLastAssistant && (
        <View style={styles.researchContainer}>
          <Text variant="labelSmall" style={[styles.researchLabel, { color: theme.colors.onSurfaceVariant }]}>
            Research Sources
          </Text>
          {researchSources.slice(0, 5).map((source: any, i: number) => (
            <View key={source.id ?? i} style={[styles.researchCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="labelSmall" style={{ fontWeight: "600", color: theme.colors.onSurface }} numberOfLines={2}>
                {source.title}
              </Text>
              {(source.authors || source.year) && (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {[source.authors, source.year].filter(Boolean).join(", ")}
                </Text>
              )}
              {source.url && (
                <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 2 }} numberOfLines={1}>
                  {source.url}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
      <ChatQuickActions content={parsed.response} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  msgContent: {
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginBottom: 6,
    gap: 8,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  researchContainer: {
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  researchLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  researchCard: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
});

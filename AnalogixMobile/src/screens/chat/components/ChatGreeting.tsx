import React, { useMemo } from "react";
import { View, Pressable } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { buildPromptSuggestions, type PromptSuggestion } from "@analogix/shared/prompts";

interface ChatGreetingProps {
  suggestions?: PromptSuggestion[];
  onSelect?: (prompt: string) => void;
}

export function ChatGreeting({ suggestions, onSelect }: ChatGreetingProps) {
  const paperTheme = useTheme();
  const chips = useMemo(
    () => suggestions?.length ? suggestions : buildPromptSuggestions({}),
    [suggestions],
  );
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 120 }}>
      <Text style={{ fontSize: 26, fontWeight: "700", color: paperTheme.colors.onSurface, textAlign: "center", lineHeight: 34 }}>
        What can I help with?
      </Text>
      <Text style={{ fontSize: 14, color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 10, lineHeight: 20 }}>
        Ask me anything - I'm here to help you learn.
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 28, flexWrap: "wrap", justifyContent: "center" }}>
        {chips.map((suggestion) => (
          <Pressable key={suggestion.label}
            onPress={() => onSelect?.(suggestion.prompt)}
            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: paperTheme.colors.surfaceVariant }}
          >
            <Text style={{ fontSize: 13, color: paperTheme.colors.onSurfaceVariant }}>{suggestion.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

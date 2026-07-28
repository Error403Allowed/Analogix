import React from "react";
import { View, Pressable } from "react-native";
import { Text, useTheme } from "react-native-paper";

export function ChatGreeting() {
  const paperTheme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 120 }}>
      <Text style={{ fontSize: 26, fontWeight: "700", color: paperTheme.colors.onSurface, textAlign: "center", lineHeight: 34 }}>
        What can I help with?
      </Text>
      <Text style={{ fontSize: 14, color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 10, lineHeight: 20 }}>
        Ask me anything — I'm here to help you learn.
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 28, flexWrap: "wrap", justifyContent: "center" }}>
        {["Explain a concept", "Make a quiz", "Study plan", "Simplify this"].map((suggestion) => (
          <Pressable key={suggestion}
            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: paperTheme.colors.surfaceVariant }}
          >
            <Text style={{ fontSize: 13, color: paperTheme.colors.onSurfaceVariant }}>{suggestion}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

import React, { useState } from "react";
import { View, StyleSheet, TextInput as RNTextInput, Pressable } from "react-native";
import { Text, Chip, Button, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { HOBBY_OPTIONS, POPULAR_INTERESTS, type HobbyId } from "../utils/interests";
import { SHAPE } from "../theme/tokens";

interface InterestPickerProps {
  selectedIds: string[];
  subtopics: Record<string, string[]>;
  onToggleHobby: (id: string) => void;
  onToggleSubtopic: (hobbyId: string, subtopic: string) => void;
  onAddCustom: (hobbyId: string, value: string) => void;
}

export default function InterestPicker({
  selectedIds,
  subtopics,
  onToggleHobby,
  onToggleSubtopic,
  onAddCustom,
}: InterestPickerProps) {
  const paperTheme = useTheme();
  const [customInput, setCustomInput] = useState<Record<string, string>>({});

  const addCustom = (id: string) => {
    const val = (customInput[id] || "").trim();
    if (!val) return;
    onAddCustom(id, val);
    setCustomInput((prev) => ({ ...prev, [id]: "" }));
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.heading}>
        Your interests
      </Text>
      <Text variant="bodyLarge" style={styles.subheading}>
        Pick what you're into — we'll tailor your AI tutor to you.
      </Text>

      <View style={styles.topics}>
        {HOBBY_OPTIONS.map((h) => {
          const selected = selectedIds.includes(h.id);
          return (
            <Animated.View key={h.id} layout={Layout.duration(200)}>
              <Chip
                selected={selected}
                onPress={() => onToggleHobby(h.id)}
                style={[styles.topicChip, { borderRadius: SHAPE.lg }]}
                mode={selected ? "flat" : "outlined"}
              >
                {h.label}
              </Chip>

              {selected && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(150)}
                  style={[styles.subPanel, { borderColor: paperTheme.colors.outlineVariant }]}
                >
                  <Text variant="labelMedium" style={styles.subLabel}>
                    Favourite {h.label.toLowerCase()}:
                  </Text>
                  <View style={styles.subChips}>
                    {POPULAR_INTERESTS[h.id].map((sub) => {
                      const isSelected = (subtopics[h.id] ?? []).includes(sub);
                      return (
                        <Chip
                          key={sub}
                          selected={isSelected}
                          onPress={() => onToggleSubtopic(h.id, sub)}
                          style={[styles.subChip, { borderRadius: SHAPE.pill }]}
                          mode={isSelected ? "flat" : "outlined"}
                          compact
                        >
                          {sub}
                        </Chip>
                      );
                    })}
                  </View>

                  {/* Custom subtopics the user has added */}
                  {(subtopics[h.id] ?? []).filter(
                    (s) => !POPULAR_INTERESTS[h.id].includes(s)
                  ).length > 0 && (
                    <View style={styles.customSection}>
                      <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                        Custom
                      </Text>
                      <View style={styles.subChips}>
                        {(subtopics[h.id] ?? [])
                          .filter((s) => !POPULAR_INTERESTS[h.id].includes(s))
                          .map((sub) => (
                            <Chip
                              key={sub}
                              selected
                              onPress={() => onToggleSubtopic(h.id, sub)}
                              style={[styles.subChip, { borderRadius: SHAPE.pill, borderStyle: "dashed" }]}
                              mode="outlined"
                              compact
                            >
                              {sub}
                            </Chip>
                          ))}
                      </View>
                    </View>
                  )}

                  {/* Custom input */}
                  <View style={styles.customRow}>
                    <RNTextInput
                      value={customInput[h.id] ?? ""}
                      onChangeText={(t) => setCustomInput((p) => ({ ...p, [h.id]: t }))}
                      placeholder={`Add your own...`}
                      placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                      style={[
                        styles.customInput,
                        {
                          color: paperTheme.colors.onSurface,
                          backgroundColor: paperTheme.colors.surfaceVariant,
                          borderRadius: SHAPE.lg,
                        },
                      ]}
                      onSubmitEditing={() => addCustom(h.id)}
                      returnKeyType="done"
                    />
                    <Button
                      mode="text"
                      onPress={() => addCustom(h.id)}
                      disabled={!(customInput[h.id] ?? "").trim()}
                      compact
                    >
                      Add
                    </Button>
                  </View>
                </Animated.View>
              )}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  heading: { fontWeight: "800", marginBottom: 4 },
  subheading: { marginBottom: 12, opacity: 0.7 },
  topics: { gap: 4 },
  topicChip: { marginBottom: 0, alignSelf: "flex-start" },
  subPanel: {
    marginLeft: 16,
    marginTop: 2,
    marginBottom: 4,
    padding: 8,
    borderWidth: 1,
    borderRadius: 10,
  },
  subLabel: { marginBottom: 4, fontWeight: "700" },
  subChips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  subChip: { marginBottom: 0 },
  customSection: { marginTop: 6 },
  customRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
  customInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14 },
});

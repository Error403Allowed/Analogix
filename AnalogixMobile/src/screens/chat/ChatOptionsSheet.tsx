import React from "react";
import { View, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { Text, useTheme, Switch } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../../components/Icon";
import { GroqModelId, GROQ_MODELS } from "../../types/groq-models";

interface ChatOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedModel: GroqModelId;
  onSelectModel: (id: GroqModelId) => void;
  researchMode: boolean;
  onToggleResearch: (v: boolean) => void;
  onUploadFile: () => void;
}

export default function ChatOptionsSheet({
  visible,
  onClose,
  selectedModel,
  onSelectModel,
  researchMode,
  onToggleResearch,
  onUploadFile,
}: ChatOptionsSheetProps) {
  const theme = useTheme();
  const c = theme.colors as any;
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.screen, { backgroundColor: c.surface ?? theme.colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
            Chat options
          </Text>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
            <Icon name="close" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
            MODEL
          </Text>
          {GROQ_MODELS.map((m) => {
            const active = m.id === selectedModel;
            return (
              <Pressable
                key={m.id}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active
                      ? (c.primaryContainer ?? theme.colors.primaryContainer)
                      : (c.surfaceContainerLow ?? theme.colors.surfaceVariant),
                  },
                ]}
                onPress={() => onSelectModel(m.id)}
              >
                <View style={styles.pillDot}>
                  {active && (
                    <View style={[styles.pillDotFill, { backgroundColor: c.onPrimaryContainer ?? theme.colors.primary }]} />
                  )}
                </View>
                <View style={styles.pillText}>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurface, fontWeight: "600" }}
                  >
                    {m.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {m.description}
                  </Text>
                </View>
                {active && (
                  <Icon
                    name="check"
                    size={18}
                    color={c.onPrimaryContainer ?? theme.colors.primary}
                  />
                )}
              </Pressable>
            );
          })}

          <View style={[styles.divider, { backgroundColor: c.outlineVariant ?? theme.colors.outlineVariant }]} />

          <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
            OPTIONS
          </Text>

          <View style={[styles.pill, { backgroundColor: c.surfaceContainerLow ?? theme.colors.surfaceVariant }]}>
            <View style={styles.pillLeft}>
              <Icon
                name="atom"
                size={20}
                color={researchMode ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                Research mode
              </Text>
            </View>
            <Switch
              value={researchMode}
              onValueChange={onToggleResearch}
              color={theme.colors.primary}
            />
          </View>

          <Pressable
            style={[styles.pill, { backgroundColor: c.surfaceContainerLow ?? theme.colors.surfaceVariant }]}
            onPress={onUploadFile}
          >
            <View style={styles.pillLeft}>
              <Icon name="paperclip" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                Upload file
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  pillDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(128,128,128,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillDotFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pillText: {
    flex: 1,
    gap: 1,
  },
  pillLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
});

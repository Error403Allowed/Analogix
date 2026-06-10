import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Text, useTheme, Portal, Modal, TextInput, Button } from "react-native-paper";
import { useMutation, useQuery } from "@apollo/client";
import { SAVE_CUSTOM_SUBJECT, CUSTOM_SUBJECTS } from "../graphql/queries/subject";
import { SHAPE } from "../theme/tokens";
import Icon from "../components/Icon";

const ICON_OPTIONS = [
  "math-integral", "leaf", "castle", "lightning-bolt", "flask",
  "book-open-variant", "code-tags", "chart-line", "briefcase", "wallet",
  "heart-pulse", "earth", "wrench", "stethoscope", "translate",
  "atom", "sigma", "graph", "music", "palette",
];

const COLOR_OPTIONS = [
  "#7C5CFF", "#0EA5E9", "#F472B6", "#F59E0B", "#10B981",
  "#A78BFA", "#EC4899", "#22C55E", "#EF4444", "#3B82F6",
  "#14B8A6", "#F97316", "#8B5CF6", "#06B6D4", "#84CC16",
];

const COVER_OPTIONS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(135deg, #f5576c 0%, #ff6f00 100%)",
  "linear-gradient(135deg, #667eea 0%, #43e97b 100%)",
];

interface Props {
  visible: boolean;
  subjectId: string;
  subjectName: string;
  onDismiss: () => void;
}

export default function SubjectCustomizationSheet({ visible, subjectId, subjectName, onDismiss }: Props) {
  const paperTheme = useTheme();
  const { data: customData } = useQuery(CUSTOM_SUBJECTS);
  const [saveCustom] = useMutation(SAVE_CUSTOM_SUBJECT, { refetchQueries: ["CustomSubjects"] });
  const existing = (customData?.customSubjects ?? []).find((c: any) => c.subjectId === subjectId);
  const [customTitle, setCustomTitle] = useState(existing?.customTitle ?? "");
  const [customIcon, setCustomIcon] = useState(existing?.customIcon ?? "");
  const [customColor, setCustomColor] = useState(existing?.customColor ?? "");
  const [customCover, setCustomCover] = useState(existing?.customCover ?? "");

  const handleSave = async () => {
    const input: Record<string, string> = {};
    if (customTitle) input.customTitle = customTitle;
    if (customIcon) input.customIcon = customIcon;
    if (customColor) input.customColor = customColor;
    if (customCover) input.customCover = customCover;
    try {
      await saveCustom({ variables: { subjectId, input } });
      onDismiss();
    } catch (err) {
      console.error("Failed to save custom subject:", err);
    }
  };

  const handleReset = async () => {
    setCustomTitle("");
    setCustomIcon("");
    setCustomColor("");
    setCustomCover("");
    try {
      await saveCustom({ variables: { subjectId, input: {} } });
      onDismiss();
    } catch (err) {
      console.error("Failed to reset:", err);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 12 }}>Customise {subjectName}</Text>

          {/* Preview */}
          <View style={[styles.preview, { backgroundColor: customColor || paperTheme.colors.primary }]}>
            <Icon name={customIcon || "book-open-variant"} size={36} color="#fff" />
            <Text variant="titleMedium" style={{ color: "#fff", fontWeight: "700", marginTop: 6 }}>{customTitle || subjectName}</Text>
          </View>

          <Text variant="labelLarge" style={{ fontWeight: "600", marginTop: 16, marginBottom: 8 }}>Title</Text>
          <TextInput
            mode="outlined" placeholder={subjectName}
            value={customTitle} onChangeText={setCustomTitle}
            style={{ marginBottom: 8 }}
          />

          <Text variant="labelLarge" style={{ fontWeight: "600", marginTop: 8, marginBottom: 8 }}>Icon</Text>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((icon) => (
              <Pressable
                key={icon}
                onPress={() => setCustomIcon(icon)}
                style={[styles.iconCell, {
                  backgroundColor: customIcon === icon ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant,
                  borderRadius: SHAPE.md,
                }]}
              >
                <Icon name={icon} size={20} color={customIcon === icon ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface} />
              </Pressable>
            ))}
          </View>

          <Text variant="labelLarge" style={{ fontWeight: "600", marginTop: 12, marginBottom: 8 }}>Color</Text>
          <View style={styles.colorGrid}>
            {COLOR_OPTIONS.map((color) => (
              <Pressable
                key={color}
                onPress={() => setCustomColor(color)}
                style={[styles.colorCell, {
                  backgroundColor: color,
                  borderWidth: customColor === color ? 3 : 0,
                  borderColor: paperTheme.colors.onSurface,
                }]}
              />
            ))}
          </View>

          <Text variant="labelLarge" style={{ fontWeight: "600", marginTop: 12, marginBottom: 8 }}>Cover</Text>
          <View style={styles.coverGrid}>
            {COVER_OPTIONS.map((grad, idx) => {
              const [_, cs] = grad.match(/background:\s*(.+?)(?:;|$)/) ?? [];
              const colors = grad.match(/#[a-f0-9]{6}/gi) ?? [];
              return (
                <Pressable
                  key={idx}
                  onPress={() => setCustomCover(`cover_${idx}`)}
                  style={[styles.coverCell, {
                    borderWidth: customCover === `cover_${idx}` ? 3 : 0,
                    borderColor: paperTheme.colors.onSurface,
                  }]}
                >
                  {colors.length >= 2 && (
                    <View style={StyleSheet.absoluteFill}>
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors[0] }]} />
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors[1], opacity: 0.5 }]} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Button mode="outlined" onPress={handleReset} style={{ flex: 1, marginRight: 8 }}>Reset</Button>
            <Button mode="contained" onPress={handleSave} style={{ flex: 1 }}>Save</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { margin: 16, padding: 24, borderRadius: 26, maxHeight: "85%" },
  preview: { borderRadius: SHAPE.lg, padding: 24, alignItems: "center", justifyContent: "center", minHeight: 100 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconCell: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorCell: { width: 36, height: 36, borderRadius: 18 },
  coverGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  coverCell: { width: 56, height: 56, borderRadius: SHAPE.md, overflow: "hidden" },
  actions: { flexDirection: "row", marginTop: 20, gap: 8 },
});

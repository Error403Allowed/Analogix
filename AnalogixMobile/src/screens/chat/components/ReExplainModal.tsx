import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text, useTheme, Modal } from "react-native-paper";
import Icon from "../../../components/Icon";

export function ReExplainModal({ visible, onClose, hobbies, messageId, onReExplain }: {
  visible: boolean; onClose: () => void;
  hobbies: string[];
  messageId: string | null;
  onReExplain: (messageId: string, anchor?: string) => void;
}) {
  const paperTheme = useTheme();

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}>
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>Explain Differently</Text>
        <Pressable onPress={onClose}><Icon name="close" size={20} color={paperTheme.colors.onSurfaceVariant} /></Pressable>
      </View>
      <Text style={{ fontSize: 13, color: paperTheme.colors.onSurfaceVariant, marginBottom: 16 }}>
        Pick an anchor topic to relate this concept to:
      </Text>
      <Pressable onPress={() => { if (messageId) onReExplain(messageId); onClose(); }}
        style={[styles.anchorRow, { backgroundColor: paperTheme.colors.primaryContainer }]}>
        <Text style={{ fontWeight: "600", fontSize: 14, color: paperTheme.colors.onPrimaryContainer }}>✨ Surprise me</Text>
      </Pressable>
      {hobbies.map(hobby => (
        <Pressable key={hobby} onPress={() => { if (messageId) onReExplain(messageId, hobby); onClose(); }}
          style={[styles.anchorRow, { borderBottomColor: paperTheme.colors.outlineVariant }]}>
          <Text style={{ fontSize: 13, color: paperTheme.colors.onSurface }}>{hobby}</Text>
        </Pressable>
      ))}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    margin: 20, borderRadius: 16, padding: 20, maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18, fontWeight: "700",
  },
  anchorRow: {
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8,
  },
});

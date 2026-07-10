import React from "react";
import { View, Pressable, TextInput as RNTextInput, StyleSheet } from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import Icon from "../../../components/Icon";
import { FileChip } from "./FileChip";

export function ChatComposer({ text, setText, sending, handleSend, attachedFiles, onRemoveFile, onUploadFile, handleGenerateFromFiles, generatingFromFiles }: {
  text: string; setText: (t: string) => void; sending: boolean; handleSend: () => void;
  attachedFiles: { name: string }[]; onRemoveFile: (index: number) => void; onUploadFile: () => void;
  handleGenerateFromFiles: (type: "flashcards" | "quiz") => void; generatingFromFiles: boolean;
}) {
  const paperTheme = useTheme();

  return (
    <View style={styles.composer}>
      {attachedFiles.length > 0 && (
        <View style={styles.fileRow}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", flex: 1 }}>
            {attachedFiles.map((f, i) => (
              <FileChip key={i} name={f.name} onRemove={() => onRemoveFile(i)} />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <Pressable onPress={() => handleGenerateFromFiles("flashcards")}
              style={styles.genBtn} disabled={generatingFromFiles}>
              <Text style={styles.genBtnText}>{generatingFromFiles ? "..." : "Cards"}</Text>
            </Pressable>
            <Pressable onPress={() => handleGenerateFromFiles("quiz")}
              style={styles.genBtn} disabled={generatingFromFiles}>
              <Text style={styles.genBtnText}>{generatingFromFiles ? "..." : "Quiz"}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View style={[styles.inputRow, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
        <Pressable onPress={onUploadFile} style={styles.attachBtn}>
          <Icon name="paperclip" size={20} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
        <RNTextInput
          value={text} onChangeText={setText} placeholder="Ask anything…"
          placeholderTextColor={paperTheme.colors.onSurfaceVariant}
          style={[styles.input, { color: paperTheme.colors.onSurface }]}
          multiline maxLength={4000}
        />
        {sending ? (
          <ActivityIndicator size="small" color={paperTheme.colors.primary} />
        ) : (
          <Pressable onPress={handleSend} style={[styles.sendBtn, { backgroundColor: text.trim() ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant }]}>
            <Icon name="send" size={18} color={text.trim() ? "#fff" : paperTheme.colors.onSurfaceVariant} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#e0e0e0",
  },
  fileRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 8,
  },
  genBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: "#6366f1",
  },
  genBtnText: {
    fontSize: 11, fontWeight: "600", color: "#fff",
  },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4,
  },
  attachBtn: {
    padding: 6,
  },
  input: {
    flex: 1, fontSize: 15, maxHeight: 100, paddingHorizontal: 8, paddingVertical: 8,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center",
  },
});

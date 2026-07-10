import React from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { Text, Searchbar, useTheme, Modal } from "react-native-paper";
import Icon from "../../../components/Icon";

export function SubjectPickerModal({ visible, onClose, subjects, currentSubjectId, onSelectSubject }: {
  visible: boolean; onClose: () => void;
  subjects?: { id: string; name: string; icon: string }[];
  currentSubjectId?: string | null;
  onSelectSubject: (id: string) => void;
}) {
  const [search, setSearch] = React.useState("");
  const paperTheme = useTheme();
  const filtered = (subjects ?? []).filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}>
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>Switch Subject</Text>
        <Pressable onPress={onClose}><Icon name="close" size={20} color={paperTheme.colors.onSurfaceVariant} /></Pressable>
      </View>
      <Searchbar placeholder="Search subjects" value={search} onChangeText={setSearch}
        style={{ marginBottom: 12, backgroundColor: paperTheme.colors.surfaceVariant }} />
      <FlatList data={filtered} keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => { onSelectSubject(item.id); onClose(); }}
            style={[styles.subjectRow, { borderBottomColor: paperTheme.colors.outlineVariant },
              currentSubjectId === item.id && { backgroundColor: paperTheme.colors.primaryContainer }]}>
            <Text style={{ fontSize: 16 }}>{item.icon}</Text>
            <Text style={{ fontSize: 14, color: paperTheme.colors.onSurface, marginLeft: 10, fontWeight: currentSubjectId === item.id ? "700" : "400" }}>
              {item.name}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: paperTheme.colors.onSurfaceVariant, padding: 20 }}>No subjects found</Text>}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    margin: 20, borderRadius: 16, padding: 20, maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18, fontWeight: "700",
  },
  subjectRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1,
  },
});

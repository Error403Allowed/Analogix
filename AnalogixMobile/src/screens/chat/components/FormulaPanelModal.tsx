import React from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { Text, Searchbar, useTheme, Modal } from "react-native-paper";
import Icon from "../../../components/Icon";
import FormulaRenderer from "../../../components/FormulaRenderer";

export function FormulaPanelModal({ visible, onClose, formulaSheet }: {
  visible: boolean; onClose: () => void;
  formulaSheet?: { categories: { name: string; formulas: { name: string; latex: string }[] }[] };
}) {
  const [search, setSearch] = React.useState("");
  const paperTheme = useTheme();

  const allFormulas = (formulaSheet?.categories ?? []).flatMap(c =>
    c.formulas.map(f => ({ ...f, category: c.name }))
  ).filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}>
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: paperTheme.colors.onSurface }]}>Formula Sheet</Text>
        <Pressable onPress={onClose}><Icon name="close" size={20} color={paperTheme.colors.onSurfaceVariant} /></Pressable>
      </View>
      <Searchbar placeholder="Search formulas" value={search} onChangeText={setSearch}
        style={{ marginBottom: 12, backgroundColor: paperTheme.colors.surfaceVariant }} />
      <FlatList data={allFormulas} keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={styles.formulaRow}>
            <Text style={{ fontSize: 12, color: paperTheme.colors.onSurfaceVariant, marginBottom: 4 }}>{item.category}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: paperTheme.colors.onSurface, marginBottom: 6 }}>{item.name}</Text>
            <FormulaRenderer math={item.latex} />
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: paperTheme.colors.onSurfaceVariant, padding: 20 }}>No formulas found</Text>}
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
  formulaRow: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e0e0e0",
  },
});

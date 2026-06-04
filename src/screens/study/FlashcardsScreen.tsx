/**
 * Flashcards list — shows all sets + due cards, with a "Start review" CTA.
 */
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Text, useTheme, Chip, ActivityIndicator, IconButton, Button, Modal, Portal, TextInput } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { FLASHCARDS, FLASHCARD_SETS, FLASHCARDS_DUE, GENERATE_FLASHCARDS, CREATE_FLASHCARD } from "../../graphql/queries/flashcard";
import { ME } from "../../graphql/queries/user";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize } from "../../hooks/useResponsive";
import Icon from "../../components/Icon";

export default function FlashcardsScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const size = useScreenSize();
  const isCompact = size === "compact";
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");

  const me = useQuery(ME);
  const sets = useQuery(FLASHCARD_SETS, { variables: { subjectId: subjectFilter } });
  const due = useQuery(FLASHCARDS_DUE, { variables: { subjectId: subjectFilter, limit: 50 } });
  const [createFlashcard, { loading: creating }] = useMutation(CREATE_FLASHCARD, { refetchQueries: [{ query: FLASHCARDS, variables: { subjectId: subjectFilter } }, { query: FLASHCARDS_DUE, variables: { subjectId: subjectFilter, limit: 50 } }] });

  const subjects = me.data?.me?.subjects ?? [];
  const dueCards = due.data?.flashcardsDue ?? [];
  const allSets = sets.data?.flashcardSets ?? [];

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.header, { paddingTop: isCompact ? 40 : 56 }]}>
        <View>
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>Your</Text>
          <Text variant={isCompact ? "headlineMedium" : "headlineLarge"} style={styles.title}>Flashcards</Text>
        </View>
        <IconButton icon="plus" iconColor={brand.primary} size={28} onPress={() => setShowAdd(true)} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subjectChips}
      >
        <Chip
          selected={!subjectFilter}
          onPress={() => setSubjectFilter(null)}
          style={[styles.chip, { borderRadius: SHAPE.lg }]}
          mode="outlined"
        >
          All
        </Chip>
        {subjects.map((s: string) => (
          <Chip
            key={s}
            selected={subjectFilter === s}
            onPress={() => setSubjectFilter(s)}
            style={[styles.chip, { borderRadius: SHAPE.lg }]}
            mode="outlined"
          >
            {s}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={due.loading} onRefresh={() => { due.refetch(); sets.refetch(); }} tintColor={brand.primary} />}
      >
        {dueCards.length > 0 && (
          <Pressable onPress={() => navigation.navigate("FlashcardReview")}>
            <View style={[styles.dueCard, { backgroundColor: brand.primary, borderRadius: SHAPE.xl }]}>
              <View>
                <Text variant="titleMedium" style={{ color: "#fff", fontWeight: "800" }}>
                  {dueCards.length} card{dueCards.length === 1 ? "" : "s"} due
                </Text>
                <Text variant="bodySmall" style={{ color: "#ffffffcc" }}>
                  Start a review session
                </Text>
              </View>
              <Icon name="play" size={32} color="#fff" />
            </View>
          </Pressable>
        )}

        <Text variant="titleMedium" style={styles.sectionTitle}>Sets</Text>
        {allSets.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginVertical: 24 }}>
            No sets yet. Tap + to add a card.
          </Text>
        ) : (
          allSets.map((s: any) => (
            <View key={s.id} style={[styles.row, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
              <Icon name="card-multiple" size={24} color={brand.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall">{s.name}</Text>
                <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{s.cardCount} cards</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={showAdd}
          onDismiss={() => setShowAdd(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.xl }]}
        >
          <Text variant="titleLarge" style={{ fontWeight: "800" }}>New flashcard</Text>
          <TextInput label="Front" value={newFront} onChangeText={setNewFront} mode="outlined" style={styles.input} />
          <TextInput label="Back" value={newBack} onChangeText={setNewBack} mode="outlined" multiline style={styles.input} />
          <View style={styles.modalActions}>
            <Button onPress={() => setShowAdd(false)}>Cancel</Button>
            <Button
              mode="contained"
              loading={creating}
              disabled={!newFront.trim() || !newBack.trim() || !subjectFilter}
              onPress={async () => {
                await createFlashcard({ variables: { input: { subjectId: subjectFilter, front: newFront, back: newBack } } });
                setNewFront("");
                setNewBack("");
                setShowAdd(false);
              }}
            >
              Add
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontWeight: "900" },
  subjectChips: { paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  chip: { marginRight: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 100, gap: 8 },
  dueCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, marginBottom: 16 },
  sectionTitle: { fontWeight: "800", marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, marginBottom: 8 },
  modal: { margin: 24, padding: 24 },
  input: { marginTop: 12 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 16 },
});

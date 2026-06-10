import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, Card, IconButton, ProgressBar, FAB, Portal, Modal, TextInput, Button } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigation, useRoute } from "@react-navigation/native";
import { FLASHCARD_SETS, FLASHCARDS_DUE, CREATE_FLASHCARD_SET } from "../../graphql/queries/flashcard";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

export default function FlashcardsScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const subjectId = route.params?.subjectId as string | undefined;
  const { data: setsData, refetch } = useQuery(FLASHCARD_SETS, { variables: { subjectId } });
  const { data: dueData } = useQuery(FLASHCARDS_DUE, { variables: { limit: 100, subjectId } });
  const [createSet, { loading: creating }] = useMutation(CREATE_FLASHCARD_SET);
  const [showCreate, setShowCreate] = useState(false);
  const [setName, setSetName] = useState("");
  const sets = setsData?.flashcardSets ?? [];
  const dueCount = dueData?.flashcardsDue?.length ?? 0;

  const handleCreateSet = async () => {
    if (!setName.trim()) return;
    try {
      const { data } = await createSet({
        variables: {
          input: {
            name: setName.trim(),
            subjectId: subjectId ?? "general",
          },
        },
      });
      const created = data?.createFlashcardSet;
      setShowCreate(false);
      setSetName("");
      refetch();
      if (created?.id) {
        navigation.navigate("FlashcardSet", {
          setId: created.id,
          name: created.name,
          subjectId: created.subjectId ?? subjectId,
        });
      }
    } catch (err) {
      console.error("Failed to create flashcard set:", err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Flashcards</Text>
      </View>

      <View style={styles.dueCard}>
        <Card mode="elevated" style={styles.dueInner}>
          <Card.Content style={styles.dueContent}>
            <View>
              <Text variant="titleMedium" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>Due for review</Text>
              <Text variant="bodySmall" style={{ color: dueCount > 0 ? brand.primary : paperTheme.colors.onSurfaceVariant }}>
                {dueCount} card{dueCount !== 1 ? "s" : ""} due today
              </Text>
            </View>
            <Icon name="cards" size={32} color={brand.primary} />
          </Card.Content>
        </Card>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list}>
        {sets.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="cards-outline" size={64} color={paperTheme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 16, textAlign: "center" }}>
              No flashcard sets yet. Tap + to create one.
            </Text>
          </View>
        ) : (
          sets.map((d: any) => (
            <Card
              key={d.id}
              mode="outlined"
              style={styles.deckCard}
              onPress={() => navigation.navigate("FlashcardSet", { setId: d.id, name: d.name, subjectId: d.subjectId })}
            >
              <Card.Content>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={[styles.deckIcon, { backgroundColor: brand.primary + "18" }]}>
                    <Icon name="cards" size={22} color={brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{d.name}</Text>
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{d.cardCount ?? 0} cards</Text>
                  </View>
                  <ProgressBar progress={Math.min((d.cardCount ?? 0) / 20, 1)} color={brand.primary} style={[styles.masteryBar, { backgroundColor: paperTheme.colors.surfaceVariant }]} />
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB icon="plus" color="#fff" style={[styles.fab, { backgroundColor: brand.primary }]} onPress={() => setShowCreate(true)} />

      <Portal>
        <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>New flashcard set</Text>
          <TextInput mode="outlined" label="Set name" value={setName} onChangeText={setSetName} style={{ marginBottom: 16 }} />
          <Button mode="contained" buttonColor={brand.primary} loading={creating} onPress={handleCreateSet} disabled={!setName.trim()}>
            Create
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  dueCard: { paddingHorizontal: 16, marginBottom: 8 },
  dueInner: { borderRadius: SHAPE.lg },
  dueContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  list: { padding: 16, paddingBottom: 120, gap: 8 },
  deckCard: { borderRadius: SHAPE.lg },
  deckIcon: { width: 42, height: 42, borderRadius: SHAPE.md, alignItems: "center", justifyContent: "center" },
  masteryBar: { height: 6, borderRadius: SHAPE.xs, width: 60 },
  fab: { position: "absolute", right: 16, bottom: 100, borderRadius: SHAPE.lg },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },
});

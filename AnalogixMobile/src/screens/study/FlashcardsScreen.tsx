import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, FAB, Portal, Modal, TextInput, Button, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigation, useRoute } from "@react-navigation/native";
import { FLASHCARD_SETS, FLASHCARDS_DUE, CREATE_FLASHCARD_SET } from "../../graphql/queries/flashcard";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import {
  ExpressiveCard,
  ExpressiveEmptyState,
  ExpressiveRailCard,
  ExpressiveScreen,
  ExpressiveSection,
  PressableScale,
} from "../../components/expressive";
import Icon from "../../components/Icon";

export default function FlashcardsScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const subjectId = route.params?.subjectId as string | undefined;
  const { data: setsData, loading: setsLoading, error: setsError, refetch } = useQuery(FLASHCARD_SETS, { variables: { subjectId } });
  const { data: dueData } = useQuery(FLASHCARDS_DUE, { variables: { limit: 100, subjectId } });
  const [createSet, { loading: creating }] = useMutation(CREATE_FLASHCARD_SET);
  const [showCreate, setShowCreate] = useState(false);
  const [setName, setSetName] = useState("");
  const sets = setsData?.flashcardSets ?? [];
  const dueCards = dueData?.flashcardsDue ?? [];
  const dueCount = dueCards.length;

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
    <ExpressiveScreen
      title="Flashcards"
      subtitle={`${sets.length} set${sets.length !== 1 ? "s" : ""}`}
      leadingIcon="cards"
      onBack={() => navigation.goBack()}
    >
      <View style={styles.overview}>
        <ExpressiveRailCard value={sets.reduce((s: number, d: any) => s + (d.cardCount ?? 0), 0)} label="Total cards" icon="cards" />
        <ExpressiveRailCard value={dueCount} label="Due for review" icon="clock-outline" />
      </View>

      {dueCount > 0 && (
        <PressableScale onPress={() => {
          const dueSetId = dueCards.find((card: any) => card.setId)?.setId;
          const fallbackSet = sets[0];
          if (dueSetId || fallbackSet?.id) navigation.navigate("FlashcardReview", { setId: dueSetId ?? fallbackSet.id });
        }}>
          <View style={[styles.reviewBanner, { backgroundColor: brand.primary }]}>
            <Icon name="cards" size={20} color="#fff" />
            <Text variant="labelLarge" style={{ color: "#fff", fontWeight: "800" }}>
              Review {dueCount} card{dueCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </PressableScale>
      )}

      <ExpressiveSection title="Your sets">
        {setsLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={brand.primary} />
            <Text style={{ color: paperTheme.colors.onSurfaceVariant }}>Loading flashcard sets...</Text>
          </View>
        ) : setsError ? (
          <View style={styles.centerState}>
            <ExpressiveEmptyState icon="alert-circle" title="Could not load sets" subtitle="Check your connection and try again." />
            <Button mode="contained" buttonColor={brand.primary} onPress={() => refetch()} style={{ borderRadius: SHAPE.lg }}>
              Retry
            </Button>
          </View>
        ) : sets.length === 0 ? (
          <ExpressiveEmptyState icon="cards-outline" title="No flashcard sets" subtitle='Tap + to create your first set.' />
        ) : (
          <View style={{ gap: 8 }}>
            {sets.map((d: any) => (
              <ExpressiveCard
                key={d.id}
                tone="low"
                onPress={() => navigation.navigate("FlashcardSet", { setId: d.id, name: d.name, subjectId: d.subjectId })}
              >
                <View style={styles.setRow}>
                  <View style={[styles.setIcon, { backgroundColor: brand.primary + "18" }]}>
                    <Icon name="cards" size={22} color={brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>{d.name}</Text>
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 2 }}>{d.cardCount ?? 0} cards</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={paperTheme.colors.onSurfaceVariant} />
                </View>
              </ExpressiveCard>
            ))}
          </View>
        )}
      </ExpressiveSection>

      <FAB
        icon="plus"
        color="#fff"
        style={[styles.fab, { backgroundColor: brand.primary }]}
        onPress={() => setShowCreate(true)}
      />

      <Portal>
        <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>New flashcard set</Text>
          <TextInput mode="outlined" label="Set name" value={setName} onChangeText={setSetName} style={{ marginBottom: 16 }} />
          <Button mode="contained" buttonColor={brand.primary} loading={creating} onPress={handleCreateSet} disabled={!setName.trim()}>
            Create
          </Button>
        </Modal>
      </Portal>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  overview: { flexDirection: "row", gap: 8, marginBottom: 8 },
  reviewBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: SHAPE.lg,
    marginBottom: 8,
  },
  setRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  setIcon: { width: 44, height: 44, borderRadius: SHAPE.md, alignItems: "center", justifyContent: "center" },
  centerState: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: 12 },
  fab: { position: "absolute", right: 16, bottom: 16, borderRadius: SHAPE.lg },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },
});

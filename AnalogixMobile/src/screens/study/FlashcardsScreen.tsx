import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, Card, IconButton, ProgressBar, FAB } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { FLASHCARDS } from "../../graphql/queries/flashcard";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

export default function FlashcardsScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { data } = useQuery(FLASHCARDS);
  const decks = data?.flashcardDecks ?? [];

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
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>0 cards due today</Text>
            </View>
            <Icon name="cards" size={32} color={brand.primary} />
          </Card.Content>
        </Card>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {decks.map((d: any) => (
          <Card key={d.id} mode="outlined" style={styles.deckCard} onPress={() => navigation.navigate("FlashcardReview", { deckId: d.id })}>
            <Card.Content>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.deckIcon, { backgroundColor: brand.primary + "18" }]}>
                  <Icon name="cards" size={22} color={brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{d.name}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{d.cardCount ?? 0} cards</Text>
                </View>
                <ProgressBar progress={(d.mastery ?? 0) / 100} color={brand.primary} style={[styles.masteryBar, { backgroundColor: paperTheme.colors.surfaceVariant }]} />
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <FAB icon="plus" color="#fff" style={[styles.fab, { backgroundColor: brand.primary }]} onPress={() => {}} />
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
});

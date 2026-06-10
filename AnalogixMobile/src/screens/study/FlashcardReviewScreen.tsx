import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, useTheme, IconButton, Card, Button, ProgressBar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { FLASHCARDS, GRADE_FLASHCARD } from "../../graphql/queries/flashcard";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";

export default function FlashcardReviewScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { setId } = route.params;
  const { data, loading } = useQuery(FLASHCARDS, { variables: { setId } });
  const [gradeFlashcard] = useMutation(GRADE_FLASHCARD);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const cards = data?.flashcards ?? [];
  const card = cards[idx];

  const grade = async (quality: number) => {
    if (!card) return;
    await gradeFlashcard({ variables: { id: card.id, quality } });
    if (idx < cards.length - 1) {
      setIdx(idx + 1);
      setFlipped(false);
    } else {
      navigation.goBack();
    }
  };

  if (loading || !card) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <Text variant="titleMedium" style={{ fontWeight: "700", flex: 1 }}>Review</Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>{idx + 1}/{cards.length}</Text>
      </View>

      <ProgressBar progress={(idx + 1) / cards.length} color={brand.primary} style={[styles.progress, { backgroundColor: paperTheme.colors.surfaceVariant }]} />

      <View style={styles.cardWrap}>
        <Pressable onPress={() => setFlipped(!flipped)} style={{ flex: 1, justifyContent: "center" }} accessibilityLabel={flipped ? "Show question" : "Show answer"} accessibilityHint="Tap to flip the card">
          <Card mode="elevated" style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 12 }}>
                {flipped ? "Answer" : "Question"}
              </Text>
              <Text variant="headlineSmall" style={{ fontWeight: "600", color: paperTheme.colors.onSurface, textAlign: "center" }}>
                {flipped ? card.back : card.front}
              </Text>
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 24 }}>
                Tap to flip
              </Text>
            </Card.Content>
          </Card>
        </Pressable>
      </View>

      {flipped && (
        <View style={[styles.grades, { paddingBottom: insets.bottom + 24 }]}>
          <Button mode="outlined" style={styles.gradeBtn} textColor={paperTheme.colors.error} onPress={() => grade(1)}>
            Again
          </Button>
          <Button mode="outlined" style={styles.gradeBtn} textColor={brand.primary} onPress={() => grade(2)}>
            Good
          </Button>
          <Button mode="contained" buttonColor={brand.primary} style={styles.gradeBtn} onPress={() => grade(3)}>
            Easy
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  progress: { height: 6, marginHorizontal: 16, borderRadius: SHAPE.xs },
  cardWrap: { flex: 1, padding: 20, justifyContent: "center" },
  card: { borderRadius: SHAPE.xl, minHeight: 300, justifyContent: "center" },
  cardContent: { paddingVertical: 32, alignItems: "center" },
  grades: { flexDirection: "row", padding: 20, gap: 8 },
  gradeBtn: { flex: 1, borderRadius: SHAPE.lg },
});

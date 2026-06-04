/**
 * Flashcard review — SM-2 grading (Again / Hard / Good / Easy).
 * Animates the card flip with Reanimated.
 */
import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, Button, useTheme, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { FLASHCARDS_DUE, GRADE_FLASHCARD } from "../../graphql/queries/flashcard";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE, MOTION } from "../../theme/tokens";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const QUALITY = [
  { label: "Again", quality: 1, color: "#FF3B5B" },
  { label: "Hard", quality: 3, color: "#FF8A4A" },
  { label: "Good", quality: 4, color: "#00C2A8" },
  { label: "Easy", quality: 5, color: "#5B5FE9" },
];

export default function FlashcardReviewScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { data, loading, refetch } = useQuery(FLASHCARDS_DUE, { variables: { limit: 50 } });
  const [grade, { loading: grading }] = useMutation(GRADE_FLASHCARD);

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(0);
  const flip = useSharedValue(0);

  const cards = data?.flashcardsDue ?? [];
  const card = cards[idx];
  const total = cards.length;

  const flipAnim = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${flip.value}deg` }],
  }));

  const handleFlip = useCallback(() => {
    flip.value = withTiming(flipped ? 0 : 180, { duration: 400 });
    setFlipped(!flipped);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [flipped, flip]);

  const handleGrade = useCallback(
    async (q: number) => {
      if (!card) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await grade({ variables: { id: card.id, quality: q } });
      setCompleted((c) => c + 1);
      flip.value = withSpring(0, MOTION.entry as never);
      setFlipped(false);
      if (idx + 1 < total) {
        setIdx(idx + 1);
      } else {
        // Refetch in case more cards became due
        refetch();
        setIdx(0);
      }
    },
    [card, grade, idx, total, flip, refetch]
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!card) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <View style={styles.empty}>
          <Text variant="displaySmall" style={{ fontSize: 64 }}>🎉</Text>
          <Text variant="headlineLarge" style={{ fontWeight: "900", marginTop: 16 }}>
            All caught up!
          </Text>
          <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 8 }}>
            You reviewed {completed} cards.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 24, borderRadius: SHAPE.xl }}
            contentStyle={{ height: 52 }}
          >
            Done
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="labelLarge" style={{ color: paperTheme.colors.onSurfaceVariant }}>
          Card {idx + 1} of {total}
        </Text>
        <Text variant="labelLarge" style={{ color: paperTheme.colors.onSurfaceVariant }}>
          {Math.round((idx / total) * 100)}%
        </Text>
      </View>

      <View style={styles.cardArea}>
        <Pressable onPress={handleFlip} style={{ width: "100%" }}>
          <Animated.View style={[styles.card, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.xxl }, flipAnim]}>
            {!flipped ? (
              <View style={styles.cardContent}>
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                  FRONT · {card.subjectId}
                </Text>
                <Text variant="headlineMedium" style={styles.cardText}>
                  {card.front}
                </Text>
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 16 }}>
                  Tap to reveal
                </Text>
              </View>
            ) : (
              <View style={[styles.cardContent, { transform: [{ rotateY: "180deg" }] }]}>
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                  BACK
                </Text>
                <Text variant="bodyLarge" style={styles.cardText}>
                  {card.back}
                </Text>
              </View>
            )}
          </Animated.View>
        </Pressable>
      </View>

      {flipped ? (
        <View style={styles.gradeRow}>
          {QUALITY.map((q) => (
            <Button
              key={q.label}
              mode="contained"
              buttonColor={q.color}
              onPress={() => handleGrade(q.quality)}
              loading={grading}
              style={{ flex: 1, borderRadius: SHAPE.lg }}
              contentStyle={{ height: 56 }}
            >
              {q.label}
            </Button>
          ))}
        </View>
      ) : (
        <Button
          mode="contained"
          onPress={handleFlip}
          style={{ borderRadius: SHAPE.xl, marginTop: 16 }}
          contentStyle={{ height: 56 }}
        >
          Show answer
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  cardArea: { flex: 1, justifyContent: "center" },
  card: { aspectRatio: 3 / 4, maxHeight: 500, padding: 24, justifyContent: "space-between", backfaceVisibility: "hidden" },
  cardContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  cardText: { fontWeight: "700", textAlign: "center", marginTop: 16 },
  gradeRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
});

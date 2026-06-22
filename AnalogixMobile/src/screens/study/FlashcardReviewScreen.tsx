import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, useWindowDimensions, Alert } from "react-native";
import { Text, useTheme, Card, Button, ProgressBar, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { FLASHCARDS, GRADE_FLASHCARD } from "../../graphql/queries/flashcard";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { ExpressiveScreen } from "../../components/expressive";

const CARD_H = 320;

function FlipCard({ front, back, flipped, onFlip, cardKey }: {
  front: string; back: string; flipped: boolean; onFlip: () => void; cardKey: string;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 40, 420);
  const r = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1400 },
      { rotateY: withTiming(flipped ? "180deg" : "0deg", { duration: 400 }) },
    ],
  }));

  const frontStyle = useAnimatedStyle(() => ({
    backfaceVisibility: "hidden" as const,
    position: "absolute" as const,
    width: "100%",
    height: "100%",
  }));

  const backStyle = useAnimatedStyle(() => ({
    backfaceVisibility: "hidden" as const,
    position: "absolute" as const,
    width: "100%",
    height: "100%",
    transform: [{ rotateY: "180deg" }],
  }));

  return (
    <Pressable
      key={cardKey}
      onPress={onFlip}
      style={styles.flipPressable}
      accessibilityRole="button"
      accessibilityLabel={flipped ? "Show flashcard front" : "Show flashcard back"}
    >
      <Animated.View style={[styles.flipFrame, { width: cardWidth, height: CARD_H }, r]}>
        <Animated.View style={frontStyle}>
          <Card mode="elevated" style={styles.flipCard}>
            <Card.Content style={styles.flipCardContent}>
              <Text variant="labelSmall" style={{ color: "#6366f1", textAlign: "center", marginBottom: 12, fontWeight: "700", letterSpacing: 1 }}>
                TERM
              </Text>
              <Text variant="headlineSmall" style={{ fontWeight: "700", color: "#1a1a2e", textAlign: "center", lineHeight: 30 }}>
                {front}
              </Text>
              <Text variant="bodySmall" style={{ color: "#94a3b8", textAlign: "center", marginTop: 24, fontSize: 11 }}>
                Tap to flip
              </Text>
            </Card.Content>
          </Card>
        </Animated.View>
        <Animated.View style={backStyle}>
          <Card mode="elevated" style={[styles.flipCard, { borderColor: "#10b98144" }]}>
            <Card.Content style={styles.flipCardContent}>
              <Text variant="labelSmall" style={{ color: "#10b981", textAlign: "center", marginBottom: 12, fontWeight: "700", letterSpacing: 1 }}>
                DEFINITION
              </Text>
              <Text variant="bodyLarge" style={{ fontWeight: "500", color: "#1a1a2e", textAlign: "center", lineHeight: 24 }}>
                {back}
              </Text>
              <Text variant="bodySmall" style={{ color: "#94a3b8", textAlign: "center", marginTop: 24, fontSize: 11 }}>
                Tap to flip back
              </Text>
            </Card.Content>
          </Card>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function FlashcardReviewScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const setId = route.params?.setId;
  const { data, loading, error, refetch } = useQuery(FLASHCARDS, {
    variables: { setId },
    skip: !setId,
  });
  const [gradeFlashcard] = useMutation(GRADE_FLASHCARD);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const cards = data?.flashcards ?? [];
  const card = cards[idx];

  useEffect(() => {
    setIdx(0);
    setFlipped(false);
  }, [data?.flashcards?.length]);

  const gradingRef = useRef(false);

  const grade = async (quality: number) => {
    if (!card || gradingRef.current) return;
    gradingRef.current = true;
    try {
      await gradeFlashcard({ variables: { id: card.id, quality } });
      if (idx < cards.length - 1) {
        setIdx(i => i + 1);
        setFlipped(false);
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert("Grade Error", err?.message ?? "Could not save your rating. Check your connection.");
    } finally {
      gradingRef.current = false;
    }
  };

  if (loading) {
    return (
      <ExpressiveScreen title="Review" onBack={() => navigation.goBack()} scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
        <View style={styles.centerState}>
          <ActivityIndicator color={brand.primary} />
          <Text style={{ color: paperTheme.colors.onSurfaceVariant }}>Loading cards...</Text>
        </View>
      </ExpressiveScreen>
    );
  }

  if (error || !card) {
    return (
      <ExpressiveScreen title="Review" onBack={() => navigation.goBack()} scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
        <View style={styles.centerState}>
          <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurface, fontWeight: "700", textAlign: "center" }}>
            {error ? "Could not load flashcards" : "No cards to review"}
          </Text>
          <Text style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}>
            {error ? "Check your connection and try again." : "Add cards to this set before starting a review."}
          </Text>
          {error ? (
            <Button mode="contained" buttonColor={brand.primary} onPress={() => refetch()} style={{ borderRadius: SHAPE.lg }}>
              Retry
            </Button>
          ) : null}
        </View>
      </ExpressiveScreen>
    );
  }

  const currentNum = idx + 1;
  const totalNum = cards.length;

  return (
    <ExpressiveScreen title="Review" subtitle={`Card ${currentNum} of ${totalNum}`} onBack={() => navigation.goBack()} scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
      <ProgressBar progress={currentNum / totalNum} color={brand.primary} style={[styles.progress, { backgroundColor: paperTheme.colors.surfaceVariant }]} />

      <View style={styles.cardWrap}>
        <FlipCard
          key={`review-${idx}`}
          front={card.front}
          back={card.back}
          flipped={flipped}
          onFlip={() => setFlipped(!flipped)}
          cardKey={`review-${idx}`}
        />
      </View>

      {flipped && (
        <View style={[styles.grades, { paddingBottom: 32 }]}>
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
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  progress: { height: 6, marginHorizontal: 16, borderRadius: SHAPE.xs, marginTop: 8 },
  cardWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  grades: { flexDirection: "row", paddingHorizontal: 20, gap: 8 },
  gradeBtn: { flex: 1, borderRadius: SHAPE.lg, minHeight: 48 },
  flipPressable: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  flipFrame: { position: "relative" },
  flipCard: { borderRadius: SHAPE.xl, width: "100%", height: "100%", justifyContent: "center", borderWidth: 2, borderColor: "#6366f144" },
  flipCardContent: { paddingVertical: 32, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", height: "100%" },
});

import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, useWindowDimensions, Alert as RNAlert } from "react-native";
import { Text, useTheme, Button, ActivityIndicator, ProgressBar } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  SlideInRight,
  SlideOutLeft,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import { FLASHCARDS, GRADE_FLASHCARD } from "../../graphql/queries/flashcard";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { ExpressiveScreen } from "../../components/expressive";

const FLIP_DURATION = 450;
const FLIP_EASING = Easing.bezier(0.23, 1, 0.32, 1);

function adaptiveFontSize(text: string): number {
  const len = text.length;
  if (len < 80) return 26;
  if (len < 200) return 20;
  if (len < 400) return 17;
  return 15;
}

function FlipCard({
  front,
  back,
  flipped,
  onFlip,
  themeCardBg,
  themeBorderColor,
  brandPrimary,
}: {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
  themeCardBg: string;
  themeBorderColor: string;
  brandPrimary: string;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 40, 420);
  const flipProgress = useSharedValue(flipped ? 1 : 0);

  useEffect(() => {
    flipProgress.value = withTiming(flipped ? 1 : 0, {
      duration: FLIP_DURATION,
      easing: FLIP_EASING,
    });
  }, [flipped, flipProgress]);

  const frontStyle = useAnimatedStyle(() => {
    const rotate = flipProgress.value * 180;
    return {
      transform: [{ perspective: 1400 }, { rotateY: `${rotate}deg` }],
      backfaceVisibility: "hidden",
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotate = 180 - flipProgress.value * 180;
    return {
      transform: [{ perspective: 1400 }, { rotateY: `${rotate}deg` }],
      backfaceVisibility: "hidden",
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
    };
  });

  const frontFont = adaptiveFontSize(front);
  const backFont = adaptiveFontSize(back);

  return (
    <Pressable
      onPress={onFlip}
      accessibilityRole="button"
      accessibilityLabel={flipped ? "Show front" : "Show back"}
      style={{ width: cardWidth }}
    >
      <View style={{ minHeight: 300, position: "relative" }}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: themeCardBg, borderColor: brandPrimary + "44" },
            frontStyle,
          ]}
        >
          <View style={styles.cardInner}>
            <Text style={[styles.sideLabel, { color: brandPrimary }]}>TERM</Text>
            <Text style={[styles.mainText, { fontSize: frontFont }]}>{front}</Text>
            <Text style={[styles.tapHint, { color: brandPrimary + "99" }]}>Tap to flip</Text>
          </View>
        </Animated.View>
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            { backgroundColor: themeCardBg, borderColor: brandPrimary + "44" },
            backStyle,
          ]}
        >
          <View style={styles.cardInner}>
            <Text style={[styles.sideLabel, { color: "#10b981" }]}>DEFINITION</Text>
            <Text style={[styles.mainText, { fontSize: backFont }]}>{back}</Text>
            <Text style={[styles.tapHint, { color: brandPrimary + "99" }]}>Tap to flip back</Text>
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const RATINGS = [
  { label: "Again", quality: 0, color: "#ef4444", icon: "↺" },
  { label: "Hard", quality: 2, color: "#f97316", icon: "★" },
  { label: "Good", quality: 3, color: "#6366f1", icon: "★★" },
  { label: "Easy", quality: 5, color: "#10b981", icon: "★★★" },
] as const;

function RatingButton({ item, onPress }: { item: (typeof RATINGS)[number]; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ratingBtn,
        { backgroundColor: item.color + (pressed ? "30" : "12"), borderColor: item.color + "40" },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <Text style={styles.ratingIcon}>{item.icon}</Text>
      <Text style={[styles.ratingLabel, { color: item.color }]}>{item.label}</Text>
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
  const [done, setDone] = useState(false);

  const cards = data?.flashcards ?? [];
  const safeIdx = Math.min(idx, Math.max(0, cards.length - 1));
  const card = cards[safeIdx];

  useEffect(() => {
    setIdx(0);
    setFlipped(false);
    setDone(false);
  }, [data?.flashcards?.length]);

  const gradingRef = useRef(false);

  const grade = useCallback(
    async (quality: number) => {
      if (!card || gradingRef.current) return;
      gradingRef.current = true;
      try {
        await gradeFlashcard({ variables: { id: card.id, quality } });
        if (idx < cards.length - 1) {
          setIdx((i) => i + 1);
          setFlipped(false);
        } else {
          setDone(true);
        }
      } catch (err: any) {
        RNAlert.alert("Grade Error", err?.message ?? "Could not save your rating.");
      } finally {
        gradingRef.current = false;
      }
    },
    [card, idx, cards.length, gradeFlashcard],
  );

  const currentNum = idx + 1;
  const totalNum = cards.length;
  const progress = totalNum > 0 ? currentNum / totalNum : 0;

  if (loading) {
    return (
      <ExpressiveScreen
        title="Review"
        eyebrow="Flashcards"
        leadingIcon="cards-outline"
        onBack={() => navigation.goBack()}
        scroll
        contentStyle={{ gap: 0 }}
      >
        <View style={styles.centerState}>
          <ActivityIndicator color={brand.primary} size="large" />
          <Text style={{ color: paperTheme.colors.onSurfaceVariant }}>Loading cards...</Text>
        </View>
      </ExpressiveScreen>
    );
  }

  if (error || !card) {
    return (
      <ExpressiveScreen
        title="Review"
        eyebrow="Flashcards"
        leadingIcon="cards-outline"
        onBack={() => navigation.goBack()}
        scroll
        contentStyle={{ gap: 0 }}
      >
        <View style={styles.centerState}>
          <Text
            variant="titleMedium"
            style={{ color: paperTheme.colors.onSurface, fontWeight: "700", textAlign: "center" }}
          >
            {error ? "Could not load flashcards" : "No cards to review"}
          </Text>
          <Text style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}>
            {error
              ? "Check your connection and try again."
              : "Add cards to this set before starting a review."}
          </Text>
          {error ? (
            <Button
              mode="contained"
              buttonColor={brand.primary}
              onPress={() => refetch()}
              style={{ borderRadius: SHAPE.lg }}
            >
              Retry
            </Button>
          ) : null}
        </View>
      </ExpressiveScreen>
    );
  }

  if (done) {
    return (
      <ExpressiveScreen
        title="Review"
        eyebrow="Complete"
        leadingIcon="cards-outline"
        onBack={() => navigation.goBack()}
        scroll={false}
        contentStyle={{ gap: 0, flex: 1 }}
      >
        <View style={styles.centerState}>
          <Animated.View entering={ZoomIn.duration(400).springify()}>
            <Text style={{ fontSize: 64 }}>🏆</Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <Text style={[styles.doneTitle, { color: paperTheme.colors.onSurface }]}>
              All cards reviewed!
            </Text>
            <Text style={[styles.doneSub, { color: paperTheme.colors.onSurfaceVariant }]}>
              Great work. Come back tomorrow for more review.
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <Button
              mode="contained"
              buttonColor={brand.primary}
              onPress={() => {
                setIdx(0);
                setFlipped(false);
                setDone(false);
              }}
              style={{ borderRadius: SHAPE.lg, marginTop: 24 }}
            >
              Review Again
            </Button>
          </Animated.View>
        </View>
      </ExpressiveScreen>
    );
  }

  return (
    <ExpressiveScreen
      title="Review"
      eyebrow="Flashcards"
      subtitle={`Card ${currentNum} of ${totalNum}`}
      leadingIcon="cards-outline"
      onBack={() => navigation.goBack()}
      scroll={false}
      contentStyle={{ gap: 0, flex: 1 }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
        <ProgressBar
          progress={progress}
          color={brand.primary}
          style={[styles.progress, { backgroundColor: paperTheme.colors.surfaceVariant }]}
        />
      </View>

      <View style={styles.cardWrap}>
        <Animated.View
          key={`card-${idx}`}
          entering={SlideInRight.duration(220)}
          exiting={SlideOutLeft.duration(150)}
        >
          <FlipCard
            front={card.front}
            back={card.back}
            flipped={flipped}
            onFlip={() => setFlipped(!flipped)}
            themeCardBg={paperTheme.colors.surface}
            themeBorderColor={paperTheme.colors.outlineVariant}
            brandPrimary={brand.primary}
          />
        </Animated.View>
      </View>

      {flipped && (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.ratingsRow}>
          {RATINGS.map((r) => (
            <RatingButton key={r.label} item={r} onPress={() => grade(r.quality)} />
          ))}
        </Animated.View>
      )}
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    minHeight: 300,
  },
  progress: { height: 6, borderRadius: SHAPE.xs },
  cardWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  ratingsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 8,
    justifyContent: "center",
  },
  ratingBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    maxWidth: 88,
  },
  ratingIcon: { fontSize: 14, marginBottom: 2 },
  ratingLabel: { fontSize: 11, fontWeight: "700" },
  card: {
    borderRadius: 20,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    width: "100%",
  },
  cardBack: {},
  cardInner: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    minHeight: 260,
    justifyContent: "center",
  },
  sideLabel: { textAlign: "center", marginBottom: 12, fontWeight: "700", letterSpacing: 1.5, fontSize: 11 },
  mainText: { fontWeight: "700", textAlign: "center", lineHeight: 32 },
  tapHint: { textAlign: "center", marginTop: 24, fontSize: 11 },
  doneTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  doneSub: { fontSize: 14, textAlign: "center", marginTop: 4 },
});

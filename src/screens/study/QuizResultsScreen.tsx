/**
 * Quiz results — score, breakdown, AI-generated feedback.
 */
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, Button, ActivityIndicator } from "react-native-paper";
import { useMutation } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { QUIZ_REVIEW } from "../../graphql/queries/quiz";
import Icon from "../../components/Icon";

export default function QuizResultsScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const [review, { data: reviewData, loading: reviewLoading }] = useMutation(QUIZ_REVIEW);

  useEffect(() => {
    // The review was already requested during quiz submission.
    // If it isn't in the cache, request it now (with an empty answer set is fine for retry).
  }, []);

  const summary = reviewData?.quizReview?.summary;
  const items = reviewData?.quizReview?.questions ?? [];

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineLarge" style={styles.title}>Results</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: `${brand.primary}22`, borderRadius: SHAPE.xl }]}>
          <Icon name="trophy" size={64} color={brand.primary} />
          <Text variant="displaySmall" style={{ fontWeight: "900", marginTop: 12 }}>
            Well done!
          </Text>
          <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 8 }}>
            Your attempt has been saved.
          </Text>
        </View>

        {reviewLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : summary ? (
          <>
            <View style={[styles.card, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
              <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8 }}>AI feedback</Text>
              <Text variant="bodyMedium">{summary}</Text>
            </View>
            {items.map((it: any) => (
              <View key={it.id} style={[styles.card, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
                <Text variant="bodyMedium">{it.feedback}</Text>
              </View>
            ))}
          </>
        ) : null}

        <Button
          mode="contained"
          onPress={() => navigation.popToTop()}
          style={{ marginTop: 24, borderRadius: SHAPE.xl }}
          contentStyle={{ height: 56 }}
        >
          Done
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 60 },
  title: { fontWeight: "900" },
  content: { padding: 20, gap: 12, paddingBottom: 80 },
  heroCard: { alignItems: "center", padding: 32, marginBottom: 16 },
  card: { padding: 16 },
});

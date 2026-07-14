import React, { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, Card, Button, ActivityIndicator } from "react-native-paper";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useMutation } from "@apollo/client/react";
import { QUIZ, QUIZ_REVIEW } from "../../graphql/queries/quiz";
import { UNLOCK_ACHIEVEMENT } from "../../graphql/queries/misc";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import { ExpressiveScreen } from "../../components/expressive";
import ConfettiCannon from "react-native-confetti-cannon";

export default function QuizResultsScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { quizId, answersSummary, questions: routeQuestions, subjectId: paramSubjectId } = route.params;
  const { data } = useQuery(QUIZ, { variables: { id: quizId }, skip: !quizId });
  const [quizReview] = useMutation(QUIZ_REVIEW);
  const [unlockAchievement] = useMutation(UNLOCK_ACHIEVEMENT);
  const [review, setReview] = useState<{ summary: string; questions: { id: string; feedback: string }[] } | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(false);
  const [achievementUnlocked, setAchievementUnlocked] = useState(false);
  const confettiRef = useRef<any>(null);

  const quiz = data?.quiz;
  const questions = routeQuestions?.length ? routeQuestions : (quiz?.questions ?? []);
  const totalQuestions = answersSummary?.length ?? (questions.length || 0);

  const correctCount = useMemo(() => {
    if (!answersSummary) return 0;
    return answersSummary.filter((a: any) => a.isCorrect).length;
  }, [answersSummary]);

  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const scoreMsg = useMemo(() => {
    if (accuracy >= 80) return "Outstanding. The analogies landed.";
    if (accuracy >= 60) return "Great work. Keep making connections.";
    if (accuracy >= 40) return "Good effort. Try another angle.";
    return "Keep learning. Each pass builds clarity.";
  }, [accuracy]);

  const fetchReview = useCallback(async () => {
    const subjectId = paramSubjectId ?? quiz?.subjectId;
    if (!answersSummary || !subjectId) return;
    setReviewLoading(true);
    setReviewError(false);
    try {
      const { data: reviewData } = await quizReview({
        variables: {
          input: {
            subjectId,
            answers: answersSummary.map((a: any) => ({
              id: a.id,
              question: a.question,
              correctAnswer: a.correctAnswer,
              userAnswer: a.userAnswer,
              isCorrect: a.isCorrect,
            })),
          },
        },
      });
      setReview(reviewData?.quizReview ?? null);
    } catch (err) {
      console.error("Failed to get quiz review:", err);
      setReviewError(true);
    } finally {
      setReviewLoading(false);
    }
  }, [answersSummary, quiz?.subjectId, quizReview, paramSubjectId]);

  useEffect(() => {
    if (!review && !reviewLoading && !reviewError) fetchReview();
  }, [fetchReview, review, reviewLoading, reviewError]);

  useEffect(() => {
    if (accuracy >= 80 && !achievementUnlocked && answersSummary) {
      unlockAchievement({ variables: { achievementId: "quiz_1" } })
        .then(() => setAchievementUnlocked(true))
        .catch(() => {});
    }
  }, [accuracy, achievementUnlocked, answersSummary, unlockAchievement]);

  useEffect(() => {
    if (accuracy >= 80 && confettiRef.current) {
      const timer = setTimeout(() => {
        confettiRef.current?.start();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [accuracy]);

  return (
    <View style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
      {accuracy >= 80 && (
        <ConfettiCannon
          ref={confettiRef}
          count={150}
          origin={{ x: 200, y: 0 }}
          colors={[brand.primary, "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"]}
          autoStart={false}
          fadeOut
        />
      )}

      <ExpressiveScreen title="Results" subtitle={`${correctCount} of ${totalQuestions} correct`} onBack={() => navigation.goBack()} scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24, gap: 16 }}>
          <Card mode="elevated" style={styles.scoreCard}>
            <Card.Content style={{ alignItems: "center", gap: 8 }}>
              <Text variant="displaySmall" style={{ fontWeight: "700", color: answersSummary ? brand.primary : paperTheme.colors.onSurfaceVariant }}>
                {answersSummary ? `${accuracy}%` : "--%"}
              </Text>
              <Text variant="titleSmall" style={{ color: paperTheme.colors.onSurface, textAlign: "center" }}>
                {answersSummary ? scoreMsg : "Quiz complete!"}
              </Text>
              {answersSummary && (
                <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                  {correctCount}/{totalQuestions} correct
                </Text>
              )}

              {answersSummary && (
                <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {answersSummary.map((a: any, i: number) => (
                    <View key={i} style={[styles.bubble, { backgroundColor: a.isCorrect ? "#10b981" : "#ef4444" }]}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{i + 1}</Text>
                    </View>
                  ))}
                </View>
              )}

              {achievementUnlocked && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: brand.primary + "18", paddingHorizontal: 12, paddingVertical: 6, borderRadius: SHAPE.pill, marginTop: 4 }}>
                  <Icon name="trophy" size={16} color={brand.primary} />
                  <Text variant="labelSmall" style={{ color: brand.primary, fontWeight: "700" }}>Achievement unlocked!</Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {answersSummary && (
            <Card mode="outlined" style={styles.feedbackCard}>
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 12 }}>
                  Question Review
                </Text>
                {questions.map((q: any, i: number) => {
                  const ans = answersSummary.find((a: any) => a.id === q.id);
                  const wasCorrect = ans?.isCorrect ?? false;
                  const fb = review?.questions?.find((r: any) => r.id === q.id)?.feedback;

                  return (
                    <View key={q.id} style={{ marginBottom: 12, borderBottomWidth: i < questions.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: paperTheme.colors.outlineVariant, paddingBottom: i < questions.length - 1 ? 12 : 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <View style={[styles.bubbleSm, { backgroundColor: wasCorrect ? "#10b981" : "#ef4444" }]}>
                          <Icon name={wasCorrect ? "check" : "close"} size={12} color="#fff" />
                        </View>
                        <Text variant="bodySmall" style={{ fontWeight: "600", color: paperTheme.colors.onSurface, flex: 1 }}>
                          Q{i + 1}: {q.question.substring(0, 80)}...
                        </Text>
                      </View>
                      <View style={{ marginLeft: 28, gap: 2 }}>
                        <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                          Your answer: {ans?.userAnswer || "(unanswered)"}
                        </Text>
                        {!wasCorrect && ans?.correctAnswer && (
                          <Text variant="labelSmall" style={{ color: "#10b981" }}>
                            Correct answer: {ans.correctAnswer}
                          </Text>
                        )}
                        {fb && (
                          <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontStyle: "italic", marginTop: 2 }}>
                            {fb}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
          )}

          {reviewLoading && (
            <View style={{ alignItems: "center", paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={brand.primary} />
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 8 }}>
                Generating feedback...
              </Text>
            </View>
          )}

          {reviewError && !reviewLoading && (
            <View style={{ alignItems: "center", paddingVertical: 16, gap: 8 }}>
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                Could not generate AI feedback.
              </Text>
              <Button mode="outlined" compact onPress={fetchReview} style={{ borderRadius: SHAPE.lg }}>
                Retry
              </Button>
            </View>
          )}

          {review?.summary && (
            <Card mode="elevated" style={styles.feedbackCard}>
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 8 }}>
                  AI Summary
                </Text>
                <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurface }}>
                  {review.summary}
                </Text>
              </Card.Content>
            </Card>
          )}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Button mode="outlined" style={{ flex: 1, borderRadius: SHAPE.lg }} onPress={() => navigation.navigate("Quiz")}>
              Try Again
            </Button>
            <Button mode="contained" buttonColor={brand.primary} style={{ flex: 1, borderRadius: SHAPE.lg, height: 48 }} onPress={() => navigation.navigate("Dashboard")}>
              Dashboard
            </Button>
          </View>
        </ScrollView>
      </ExpressiveScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, padding: 20 },
  scoreCard: { borderRadius: SHAPE.xl, padding: 16 },
  feedbackCard: { borderRadius: SHAPE.lg },
  bubble: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bubbleSm: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});

/**
 * Quiz session — present questions one-by-one, collect answers, submit.
 */
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Button, ActivityIndicator, IconButton } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { QUIZZES, SUBMIT_QUIZ_ATTEMPT, GRADE_SHORT_ANSWER, QUIZ_REVIEW } from "../../graphql/queries/quiz";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

export default function QuizSessionScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { quizId, title } = route.params;
  const { data, loading } = useQuery(QUIZZES);
  const [submitAttempt, { loading: submitting }] = useMutation(SUBMIT_QUIZ_ATTEMPT);
  const [quizReview] = useMutation(QUIZ_REVIEW);

  const quiz = (data?.quizzes ?? []).find((q: any) => q.id === quizId);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { userAnswer: string; isCorrect: boolean }>>({});

  useEffect(() => {
    if (!loading && !quiz) {
      navigation.goBack();
    }
  }, [loading, quiz, navigation]);

  if (loading || !quiz) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  const q = quiz.questions[idx];
  const total = quiz.questions.length;
  const progress = (idx + 1) / total;
  const userAnswer = answers[q.id]?.userAnswer;

  const answer = (optionText: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const correct = optionText === q.correctAnswer;
    setAnswers((prev) => ({ ...prev, [q.id]: { userAnswer: optionText, isCorrect: correct } }));
  };

  const next = () => {
    if (idx + 1 < total) {
      setIdx(idx + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const answersJson = Object.entries(answers).map(([id, a]) => ({
      id,
      question: quiz.questions.find((qq: any) => qq.id.toString() === id.toString())?.question ?? "",
      correctAnswer: quiz.questions.find((qq: any) => qq.id.toString() === id.toString())?.correctAnswer ?? "",
      userAnswer: a.userAnswer,
      isCorrect: a.isCorrect,
    }));
    const { data: attempt } = await submitAttempt({
      variables: { quizId, answers: answersJson },
    });
    if (attempt?.submitQuizAttempt) {
      try {
        await quizReview({ variables: { input: { subjectId: quiz.subjectId, answers: answersJson } } });
      } catch (e) {
        console.warn("Review failed", e);
      }
      navigation.replace("QuizResults", { quizId, attemptId: attempt.submitQuizAttempt.id });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="close" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{title}</Text>
          <Text variant="titleLarge" style={{ fontWeight: "800" }}>Question {idx + 1} of {total}</Text>
        </View>
      </View>
      <View style={[styles.progressBar, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: brand.primary }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeIn.duration(300)} key={q.id}>
          <Text variant="headlineSmall" style={styles.question}>{q.question}</Text>
          {q.options?.map((opt: any) => {
            const isSelected = userAnswer === opt.text;
            return (
              <Pressable key={opt.id} onPress={() => answer(opt.text)}>
                <View
                  style={[
                    styles.option,
                    {
                      backgroundColor: isSelected ? `${brand.primary}22` : paperTheme.colors.surface,
                      borderColor: isSelected ? brand.primary : paperTheme.colors.outline,
                      borderRadius: SHAPE.lg,
                    },
                  ]}
                >
                  <View style={[styles.optionDot, { borderColor: isSelected ? brand.primary : paperTheme.colors.outline }]}>
                    {isSelected && <View style={[styles.optionDotInner, { backgroundColor: brand.primary }]} />}
                  </View>
                  <Text variant="bodyLarge" style={{ flex: 1 }}>{opt.text}</Text>
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={next}
          disabled={!userAnswer}
          loading={submitting}
          style={{ borderRadius: SHAPE.xl }}
          contentStyle={{ height: 56 }}
        >
          {idx + 1 === total ? "Finish" : "Next"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 8 },
  progressBar: { height: 6, marginHorizontal: 20, marginTop: 8, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%" },
  content: { padding: 20, gap: 12 },
  question: { fontWeight: "800", marginBottom: 16 },
  option: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, marginBottom: 8, borderWidth: 2 },
  optionDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  optionDotInner: { width: 12, height: 12, borderRadius: 6 },
  footer: { padding: 20 },
});

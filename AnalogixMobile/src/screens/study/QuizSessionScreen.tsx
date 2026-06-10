import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Text, useTheme, Card, Button, ProgressBar, IconButton, TextInput, ActivityIndicator } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useApolloClient } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SUBMIT_QUIZ_ATTEMPT, GRADE_SHORT_ANSWER } from "../../graphql/queries/quiz";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

export default function QuizSessionScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const client = useApolloClient();
  const { quizId, questions: paramQuestions, subjectId, timedDuration } = route.params;

  const questions: any[] = paramQuestions ?? [];
  const timerDuration = timedDuration ?? 0;

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [multiSelected, setMultiSelected] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [answers, setAnswers] = useState<any[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [currentCorrect, setCurrentCorrect] = useState(false);
  const [currentUserAnswer, setCurrentUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [grading, setGrading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerDuration * 60);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const question = questions[idx];
  const isShortAnswer = question?.type === "short_answer";
  const isMultiSelect = question?.type === "multiple_select";
  const canConfirm = isShortAnswer
    ? textAnswer.trim().length > 0 && !confirmed
    : isMultiSelect
    ? multiSelected.length > 0 && !confirmed
    : selected !== null && !confirmed;

  const getCorrectAnswerText = (q: any): string => {
    if (q.correctAnswer) return q.correctAnswer;
    const correctOpt = q.options?.find((o: any) => o.isCorrect);
    return correctOpt?.text ?? "";
  };

  const elapsedSeconds = timerDuration > 0 ? timerDuration * 60 - timeLeft : 0;

  useEffect(() => {
    if (timerDuration > 0 && !timedOut) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimedOut(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerDuration, timedOut]);

  const timedSubmit = useCallback(async () => {
    const allAnswers = [...answers];
    if (question && !confirmed) {
      allAnswers.push({
        id: question.id, question: question.question,
        correctAnswer: getCorrectAnswerText(question),
        userAnswer: "", isCorrect: false,
      });
    }
    setSubmitting(true);
    try {
      const { data: result } = await client.mutate({
        mutation: SUBMIT_QUIZ_ATTEMPT,
        variables: { quizId, answers: JSON.stringify(allAnswers), durationSeconds: elapsedSeconds },
      });
      navigation.navigate("QuizResults", { quizId, attemptId: result?.submitQuizAttempt?.id, answersSummary: allAnswers });
    } catch {
      navigation.navigate("QuizResults", { quizId, answersSummary: allAnswers });
    }
  }, [answers, question, confirmed, quizId, elapsedSeconds, navigation, client]);

  useEffect(() => {
    if (timedOut) timedSubmit();
  }, [timedOut, timedSubmit]);

  const handleSelect = (optIdx: number) => {
    if (confirmed) return;
    if (isMultiSelect) {
      setMultiSelected((prev) =>
        prev.includes(optIdx) ? prev.filter((i) => i !== optIdx) : [...prev, optIdx]
      );
    } else {
      setSelected(optIdx);
    }
  };

  const handleConfirm = async () => {
    if (!question || confirmed || grading) return;

    if (isShortAnswer) {
      setGrading(true);
      const answerText = textAnswer.trim();
      try {
        const { data: gradeData } = await client.mutate({
          mutation: GRADE_SHORT_ANSWER,
          variables: {
            input: {
              question: question.question,
              targetAnswer: question.correctAnswer ?? "",
              userAnswer: answerText,
            },
          },
        });
        const g = gradeData?.gradeShortAnswer;
        setCurrentCorrect(g?.isCorrect ?? false);
        setFeedback(g?.feedback ?? null);
        setCurrentUserAnswer(answerText);
      } catch {
        setCurrentCorrect(false);
        setFeedback("Could not grade this answer");
        setCurrentUserAnswer(answerText);
      } finally {
        setGrading(false);
      }
    } else if (isMultiSelect) {
      const correctIndices = (question.options ?? [])
        .map((o: any, i: number) => (o.isCorrect ? i : -1))
        .filter((i: number) => i >= 0);
      const allCorrect = correctIndices.length === multiSelected.length &&
        correctIndices.every((i: number) => multiSelected.includes(i));
      setCurrentCorrect(allCorrect);
      setCurrentUserAnswer(multiSelected.map((i: number) => question.options[i]?.text ?? "").join(", "));
    } else {
      const opt = question.options?.[selected!];
      const correct = opt?.isCorrect ?? false;
      setCurrentCorrect(correct);
      setCurrentUserAnswer(opt?.text ?? "");
    }
    setConfirmed(true);
  };

  const next = useCallback(async () => {
    const q = question;
    const userAnswer = isShortAnswer ? textAnswer.trim() :
      isMultiSelect ? multiSelected.map((i: number) => q.options[i]?.text ?? "").join(", ") :
      q.options?.[selected!]?.text ?? "";

    const answeredCorrect = isShortAnswer ? currentCorrect :
      isMultiSelect ? currentCorrect :
      q.options?.[selected!]?.isCorrect ?? false;

    const answerRecord = {
      id: q.id,
      question: q.question,
      correctAnswer: getCorrectAnswerText(q),
      userAnswer: isShortAnswer ? textAnswer.trim() : currentUserAnswer,
      isCorrect: answeredCorrect,
    };

    if (idx < questions.length - 1) {
      setAnswers((prev) => [...prev, answerRecord]);
      setIdx(idx + 1);
      setSelected(null);
      setMultiSelected([]);
      setTextAnswer("");
      setConfirmed(false);
      setCurrentCorrect(false);
      setCurrentUserAnswer("");
      setFeedback(null);
      setShowHint(false);
    } else {
      const allAnswers = [...answers, answerRecord];
      setSubmitting(true);
      try {
        const { data: result } = await client.mutate({
          mutation: SUBMIT_QUIZ_ATTEMPT,
          variables: {
            quizId,
            answers: JSON.stringify(allAnswers),
            durationSeconds: elapsedSeconds,
          },
        });
        navigation.navigate("QuizResults", {
          quizId,
          attemptId: result?.submitQuizAttempt?.id,
          answersSummary: allAnswers,
        });
      } catch (err) {
        console.error("Failed to submit:", err);
        navigation.navigate("QuizResults", { quizId, answersSummary: allAnswers });
      }
    }
  }, [idx, question, selected, multiSelected, textAnswer, currentCorrect, currentUserAnswer,
      answers, quizId, isShortAnswer, isMultiSelect, questions.length, navigation, client, elapsedSeconds]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
        <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
          <IconButton icon="close" onPress={() => navigation.goBack()} accessibilityLabel="Close quiz" />
          <Text variant="titleMedium" style={{ fontWeight: "700", flex: 1, marginLeft: 4 }} numberOfLines={1}>
            {route.params?.quizTitle ?? "Quiz"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {timerDuration > 0 && (
              <Text variant="labelMedium" style={{ color: timeLeft < 60 ? "#ef4444" : brand.primary, fontWeight: timeLeft < 60 ? "700" : "400" }}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
              </Text>
            )}
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
              {idx + 1}/{questions.length}
            </Text>
          </View>
        </View>

        <ProgressBar progress={questions.length > 0 ? (idx + 1) / questions.length : 0} color={brand.primary} style={[styles.progress, { backgroundColor: paperTheme.colors.surfaceVariant }]} />

        {questions.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Icon name="help-circle" size={48} color={paperTheme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 16, textAlign: "center" }}>
              No questions loaded.
            </Text>
          </View>
        ) : (
          <>
            <ScrollView style={styles.content} contentContainerStyle={{ gap: 16 }}>
              <Card mode="elevated" style={styles.questionCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>
                    Question {idx + 1}{question.type ? ` — ${question.type.replace(/_/g, " ")}` : ""}
                  </Text>
                  <Text variant="titleLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>
                    {question.question}
                  </Text>
                </Card.Content>
              </Card>

              {question.analogy && !confirmed && (
                <Card mode="outlined" style={{ borderRadius: SHAPE.md, backgroundColor: brand.primary + "08" }}>
                  <Card.Content style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Icon name="lightbulb-outline" size={16} color={brand.primary} />
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurface, flex: 1 }}>{question.analogy}</Text>
                  </Card.Content>
                </Card>
              )}

              {isShortAnswer && (
                <View>
                  <TextInput
                    mode="outlined"
                    placeholder="Type your answer here..."
                    value={textAnswer}
                    onChangeText={setTextAnswer}
                    multiline
                    numberOfLines={4}
                    style={styles.textInput}
                    disabled={confirmed}
                  />
                </View>
              )}

              {!isShortAnswer && (
                <View style={styles.options}>
                  {(question.options ?? []).map((opt: any, i: number) => {
                    const isSel = isMultiSelect ? multiSelected.includes(i) : selected === i;
                    const showCorrect = confirmed && opt.isCorrect;
                    const showWrong = confirmed && !opt.isCorrect && isSel;
                    return (
                      <Pressable key={opt.id ?? i} onPress={() => handleSelect(i)} disabled={confirmed}>
                        <Card
                          mode="outlined"
                          style={[styles.option, {
                            backgroundColor: showCorrect ? "#10b98122" : showWrong ? "#ef444422" : isSel ? brand.primary + "18" : paperTheme.colors.surface,
                            borderColor: showCorrect ? "#10b981" : showWrong ? "#ef4444" : isSel ? brand.primary : paperTheme.colors.outline,
                          }]}
                        >
                          <Card.Content style={styles.optionContent}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                              {isMultiSelect && (
                                <Icon name={isSel ? "checkbox-marked" : "checkbox-blank-outline"} size={20}
                                  color={showCorrect ? "#10b981" : showWrong ? "#ef4444" : isSel ? brand.primary : paperTheme.colors.onSurfaceVariant} />
                              )}
                              <Text variant="bodyLarge" style={{ flex: 1, color: paperTheme.colors.onSurface, fontWeight: isSel ? "700" : "400" }}>
                                {opt.text ?? opt}
                              </Text>
                              {!isMultiSelect && (isSel && !confirmed ? (
                                <View style={[styles.radioOuter, { borderColor: brand.primary }]}>
                                  <View style={[styles.radioInner, { backgroundColor: brand.primary }]} />
                                </View>
                              ) : showCorrect ? (
                                <Icon name="check-circle" size={20} color="#10b981" />
                              ) : showWrong ? (
                                <Icon name="close-circle" size={20} color="#ef4444" />
                              ) : null)}
                            </View>
                          </Card.Content>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {question.hint && !confirmed && (
                <Pressable onPress={() => setShowHint(!showHint)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icon name="help-circle-outline" size={16} color={paperTheme.colors.onSurfaceVariant} />
                    <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                      {showHint ? "Hide hint" : "Show hint"}
                    </Text>
                  </View>
                </Pressable>
              )}
              {showHint && question.hint && (
                <Card mode="outlined" style={{ borderRadius: SHAPE.md }}>
                  <Card.Content>
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontStyle: "italic" }}>
                      {question.hint}
                    </Text>
                  </Card.Content>
                </Card>
              )}

              {confirmed && (
                <Card mode="elevated" style={[styles.feedbackCard, { backgroundColor: currentCorrect ? "#10b98110" : "#ef444410" }]}>
                  <Card.Content style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                    <Icon name={currentCorrect ? "check-circle" : "close-circle"} size={22} color={currentCorrect ? "#10b981" : "#ef4444"} />
                    <View style={{ flex: 1 }}>
                      <Text variant="titleSmall" style={{ fontWeight: "700", color: currentCorrect ? "#10b981" : "#ef4444" }}>
                        {currentCorrect ? "Correct!" : "Needs review"}
                      </Text>
                      {!currentCorrect && getCorrectAnswerText(question) && (
                        <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurface, marginTop: 4 }}>
                          Correct answer: {getCorrectAnswerText(question)}
                        </Text>
                      )}
                      {question.explanation && (
                        <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
                          {question.explanation}
                        </Text>
                      )}
                      {feedback && (
                        <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4, fontStyle: "italic" }}>
                          {feedback}
                        </Text>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              )}

              {grading && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", paddingVertical: 8 }}>
                  <ActivityIndicator size={16} color={brand.primary} />
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Checking answer...</Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
              {submitting ? (
                <Button mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg }} disabled contentStyle={{ height: 48 }}>
                  <ActivityIndicator size={18} color="#fff" />
                </Button>
              ) : !confirmed ? (
                <Button mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg }}
                  onPress={handleConfirm}
                  disabled={!canConfirm || grading} contentStyle={{ height: 48 }}>
                  {grading ? "Checking..." : isShortAnswer ? "Submit Answer" : "Confirm Answer"}
                </Button>
              ) : (
                <Button mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg }}
                  onPress={next} contentStyle={{ height: 48 }}>
                  {idx < questions.length - 1 ? "Next Question" : "Finish Quiz"}
                </Button>
              )}
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  progress: { height: 6, marginHorizontal: 16, borderRadius: SHAPE.xs },
  content: { flex: 1, padding: 16 },
  questionCard: { borderRadius: SHAPE.lg },
  options: { gap: 8 },
  option: { borderRadius: SHAPE.lg },
  optionContent: { paddingVertical: 14 },
  textInput: { minHeight: 120, backgroundColor: "transparent" },
  feedbackCard: { borderRadius: SHAPE.lg },
  footer: { padding: 16 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
});

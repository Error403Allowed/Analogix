import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import {
  Text,
  useTheme,
  Button,
  ProgressBar,
  ActivityIndicator,
  TextInput,
} from "react-native-paper";
import { useMutation, useQuery } from "@apollo/client/react";
import { useRoute, useNavigation } from "@react-navigation/native";
import Animated, {
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  BounceIn,
  FadeInUp,
} from "react-native-reanimated";
import { useThemeContext } from "../../theme/ThemeContext";
import { QUIZ, SUBMIT_QUIZ_ATTEMPT } from "../../graphql/queries/quiz";
import Icon from "../../components/Icon";
import { ExpressiveEmptyState, ExpressiveScreen } from "../../components/expressive";

type QuizOption = { id: string; text: string; isCorrect: boolean };
type QuizQuestion = {
  id: string;
  type: string;
  question: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation?: string | null;
  hint?: string | null;
};

function normalizeQuestion(raw: any, index: number): QuizQuestion {
  const rawOptions = Array.isArray(raw?.options)
    ? raw.options
    : Array.isArray(raw?.choices)
      ? raw.choices
      : Array.isArray(raw?.answers)
        ? raw.answers
        : [];
  const correctAnswer = String(raw?.correctAnswer ?? raw?.answer ?? "");
  const options = rawOptions
    .map((option: any, optionIndex: number) => {
      const text = String(option?.text ?? option?.label ?? option?.answer ?? option ?? "");
      return {
        id: String(option?.id ?? `${raw?.id ?? index}-option-${optionIndex}`),
        text,
        isCorrect: Boolean(option?.isCorrect ?? option?.correct ?? (correctAnswer && text === correctAnswer)),
      };
    })
    .filter((opt: QuizOption) => opt.text.trim());

  return {
    id: String(raw?.id ?? `question-${index + 1}`),
    type: String(raw?.type ?? (options.length ? "multiple_choice" : "short_answer")),
    question: String(raw?.question ?? raw?.prompt ?? raw?.text ?? ""),
    options,
    correctAnswer: correctAnswer || options.find((o: QuizOption) => o.isCorrect)?.text || "",
    explanation: raw?.explanation ?? null,
    hint: raw?.hint ?? null,
  };
}

function answersMatch(userAnswer: string, correctAnswer: string) {
  const clean = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
  return clean(userAnswer) !== "" && clean(userAnswer) === clean(correctAnswer);
}

const ENCOURAGEMENTS = [
  "Brilliant work.",
  "Great job.",
  "Nailed it.",
  "Perfect. Keep going.",
  "You're on fire!",
  "Well done!",
  "Correct!",
  "That's the one!",
];

const ENCOURAGEMENTS_WRONG = [
  "Close. Keep going.",
  "Not quite — learn from it!",
  "Keep pushing!",
  "Almost there!",
  "Don't give up!",
];

export default function QuizSessionScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { quizId, questions: paramQuestions, quizTitle, subjectId } = route.params ?? {};

  const { data, loading, error, refetch } = useQuery(QUIZ, {
    variables: { id: quizId },
    skip: (paramQuestions?.length ?? 0) > 0,
  });

  const [submitAttempt, { loading: submitting }] = useMutation(SUBMIT_QUIZ_ATTEMPT);

  const questions: QuizQuestion[] = useMemo(
    () => {
      const serverQuestions = data?.quiz?.questions ?? [];
      return ((paramQuestions?.length ? paramQuestions : serverQuestions) ?? [])
        .map(normalizeQuestion)
        .filter((q: QuizQuestion) => q.question.trim());
    },
    [paramQuestions, data?.quiz?.questions],
  );

  const quizStartRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState<any[]>([]);

  const safeIdx = Math.min(idx, Math.max(0, questions.length - 1));
  const question = questions[safeIdx];
  const current = safeIdx + 1;
  const total = questions.length;
  const scoreSoFar = answers.filter((a) => a.isCorrect).length;

  useEffect(() => {
    if (!quizStartRef.current && questions.length > 0) {
      quizStartRef.current = Date.now();
    }
  }, [questions.length]);

  const encouragement = useMemo(() => {
    if (!confirmed) return null;
    const isCorrect = answers[answers.length - 1]?.isCorrect;
    if (isCorrect) {
      return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    }
    return ENCOURAGEMENTS_WRONG[Math.floor(Math.random() * ENCOURAGEMENTS_WRONG.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, answers.length]);

  const handleConfirm = useCallback(() => {
    if (!question || confirmed) return;
    const opt = selected !== null ? question.options[selected] : null;
    const userAnswer = question.options.length > 0 ? opt?.text ?? "" : writtenAnswer.trim();
    const correctAnswer =
      question.correctAnswer || question.options.find((o) => o.isCorrect)?.text || "";
    const isCorrect =
      question.options.length > 0
        ? Boolean(opt?.isCorrect)
        : answersMatch(userAnswer, correctAnswer);
    setAnswers((prev) => [
      ...prev,
      { id: question.id, question: question.question, correctAnswer, userAnswer, isCorrect },
    ]);
    setConfirmed(true);
  }, [question, confirmed, selected, writtenAnswer]);

  const handleNext = useCallback(async () => {
    if (submittingRef.current) return;
    if (current >= total) {
      submittingRef.current = true;
      try {
        const elapsedSeconds = Math.round(
          (Date.now() - (quizStartRef.current ?? Date.now())) / 1000,
        );
        await submitAttempt({
          variables: { quizId, answers, durationSeconds: elapsedSeconds },
        });
      } catch (err) {
        console.error("Failed to submit quiz attempt:", err);
      } finally {
        submittingRef.current = false;
      }
      navigation.navigate("QuizResults", {
        quizId,
        quizTitle: quizTitle ?? data?.quiz?.title,
        subjectId: subjectId ?? data?.quiz?.subjectId,
        questions,
        answersSummary: answers,
      });
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setWrittenAnswer("");
    setConfirmed(false);
  }, [current, total, quizId, answers, quizTitle, subjectId, data, questions, submitAttempt, navigation]);

  if (loading) {
    return (
      <ExpressiveScreen title="Quiz" eyebrow="Study" leadingIcon="help-circle" onBack={() => navigation.goBack()} scroll>
        <View style={S.center}>
          <ActivityIndicator size="large" />
        </View>
      </ExpressiveScreen>
    );
  }

  if (error) {
    return (
      <ExpressiveScreen title="Quiz" eyebrow="Study" leadingIcon="help-circle" onBack={() => navigation.goBack()} scroll>
        <View style={S.center}>
          <ExpressiveEmptyState
            icon="alert-circle"
            title="Could not load quiz"
            subtitle="Check your connection and try again."
          />
          <Button
            mode="contained"
            buttonColor={brand.primary}
            style={{ marginTop: 16, borderRadius: 12 }}
            onPress={() => refetch()}
          >
            Retry
          </Button>
        </View>
      </ExpressiveScreen>
    );
  }

  if (total === 0 && !loading) {
    return (
      <ExpressiveScreen title="Quiz" eyebrow="Study" leadingIcon="help-circle" onBack={() => navigation.goBack()} scroll>
        <View style={S.center}>
          <ExpressiveEmptyState
            icon="help-circle"
            title="No questions available"
            subtitle="This quiz does not contain readable questions. Try generating a new quiz."
          />
          <Button
            mode="contained"
            buttonColor={brand.primary}
            style={{ marginTop: 16, borderRadius: 12 }}
            onPress={() => navigation.goBack()}
          >
            Go Back
          </Button>
        </View>
      </ExpressiveScreen>
    );
  }

  if (!question && total > 0) {
    return (
      <ExpressiveScreen title="Quiz" eyebrow="Study" leadingIcon="help-circle" onBack={() => navigation.goBack()} scroll>
        <View style={S.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}>
            Loading question...
          </Text>
        </View>
      </ExpressiveScreen>
    );
  }

  return (
    <ExpressiveScreen
      title="Quiz"
      eyebrow="Study"
      leadingIcon="help-circle"
      subtitle={`Question ${current} of ${total}`}
      onBack={() => navigation.goBack()}
      scroll={false}
      contentStyle={{ gap: 0, flex: 1, paddingBottom: 0 }}
    >
      <ProgressBar
        progress={current / total}
        color={brand.primary}
        style={[S.progressBar, { backgroundColor: paperTheme.colors.surfaceVariant }]}
      />

      <Animated.View
        key={idx}
        entering={SlideInRight.duration(250)}
        exiting={SlideOutLeft.duration(200)}
        style={S.cardArea}
      >
        <View
          style={[
            S.questionCard,
            { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outlineVariant },
          ]}
        >
          <Text style={[S.label, { color: brand.primary }]}>
            Question {current}
          </Text>
          <Text style={[S.qText, { color: paperTheme.colors.onSurface }]}>
            {question.question}
          </Text>
          {question.hint && !confirmed ? (
            <View
              style={[
                S.hintBox,
                { backgroundColor: paperTheme.colors.primaryContainer, borderColor: paperTheme.colors.outlineVariant },
              ]}
            >
              <Icon name="lightbulb" size={14} color={brand.primary} />
              <Text
                style={{
                  color: paperTheme.colors.onPrimaryContainer,
                  fontSize: 13,
                  lineHeight: 18,
                  flex: 1,
                }}
              >
                {question.hint}
              </Text>
            </View>
          ) : null}
        </View>

        {(question.options ?? []).length === 0 ? (
          <View style={{ marginTop: 4 }}>
            <TextInput
              mode="outlined"
              label="Your answer"
              value={writtenAnswer}
              onChangeText={setWrittenAnswer}
              multiline
              disabled={confirmed}
              accessibilityLabel="Your answer"
            />
            {confirmed && question.correctAnswer ? (
              <Animated.View entering={FadeInUp.duration(200)} style={{ marginTop: 8 }}>
                <Text
                  style={{
                    color: answersMatch(writtenAnswer, question.correctAnswer)
                      ? "#10b981"
                      : "#ef4444",
                    fontWeight: "600",
                  }}
                >
                  {answersMatch(writtenAnswer, question.correctAnswer)
                    ? "✓ Correct"
                    : `✗ Answer: ${question.correctAnswer}`}
                </Text>
              </Animated.View>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 8, marginTop: 4 }}>
            {(question.options ?? []).map((opt: any, i: number) => {
              const isSel = selected === i;
              const showCorrect = confirmed && opt.isCorrect;
              const showWrong = confirmed && !opt.isCorrect && isSel;
              return (
                <Animated.View
                  key={opt.id ?? i}
                  entering={SlideInLeft.duration(200).delay(i * 60)}
                >
                  <Pressable
                    onPress={() => !confirmed && setSelected(i)}
                    disabled={confirmed}
                  >
                    <View
                      style={[
                        S.optionCard,
                        {
                          backgroundColor: showCorrect
                            ? "#10b98118"
                            : showWrong
                              ? "#ef444418"
                              : isSel
                                ? brand.primary + "15"
                                : paperTheme.colors.surface,
                          borderColor: showCorrect
                            ? "#10b981"
                            : showWrong
                              ? "#ef4444"
                              : isSel
                                ? brand.primary
                                : confirmed
                                  ? paperTheme.colors.outline + "40"
                                  : paperTheme.colors.outlineVariant,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View
                          style={[
                            S.radio,
                            {
                              borderColor: showCorrect
                                ? "#10b981"
                                : showWrong
                                  ? "#ef4444"
                                  : isSel
                                    ? brand.primary
                                    : paperTheme.colors.outlineVariant,
                            },
                          ]}
                        >
                          {isSel && (
                            <View
                              style={[
                                S.radioInner,
                                {
                                  backgroundColor: showCorrect
                                    ? "#10b981"
                                    : showWrong
                                      ? "#ef4444"
                                      : brand.primary,
                                },
                              ]}
                            />
                          )}
                        </View>
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 15,
                            color:
                              confirmed && !showCorrect && !showWrong
                                ? paperTheme.colors.onSurface + "60"
                                : paperTheme.colors.onSurface,
                            fontWeight: isSel ? "600" : "400",
                          }}
                        >
                          {opt.text}
                        </Text>
                        {showCorrect ? (
                          <Animated.View entering={BounceIn.springify().damping(12)}>
                            <Icon name="check-circle" size={22} color="#10b981" />
                          </Animated.View>
                        ) : showWrong ? (
                          <Animated.View entering={BounceIn.springify().damping(12)}>
                            <Icon name="close-circle" size={22} color="#ef4444" />
                          </Animated.View>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}

        {confirmed && question.explanation ? (
          <Animated.View
            entering={FadeInUp.duration(250)}
            style={[
              S.explanationCard,
              {
                backgroundColor: paperTheme.colors.primaryContainer,
                borderColor: paperTheme.colors.outlineVariant,
              },
            ]}
          >
            <Icon
              name="lightbulb"
              size={16}
              color={paperTheme.colors.onPrimaryContainer}
              style={{ marginBottom: 6 }}
            />
            <Text
              style={{
                color: paperTheme.colors.onPrimaryContainer,
                lineHeight: 20,
                fontSize: 14,
              }}
            >
              {question.explanation}
            </Text>
          </Animated.View>
        ) : null}
      </Animated.View>

      <View style={[S.footer, { borderTopColor: paperTheme.colors.outlineVariant }]}>
        {confirmed && encouragement ? (
          <Text style={[S.encouragement, { color: brand.primary }]}>{encouragement}</Text>
        ) : null}
        <View style={S.scoreRow}>
          <Text style={{ color: paperTheme.colors.onSurfaceVariant, fontSize: 13, fontWeight: "500" }}>
            {scoreSoFar}/{total} correct
          </Text>
        </View>
        {!confirmed ? (
          <Button
            mode="contained"
            buttonColor={brand.primary}
            style={S.btn}
            contentStyle={{ height: 50 }}
            labelStyle={{ fontSize: 15, fontWeight: "700" }}
            onPress={handleConfirm}
            disabled={
              question.options.length > 0 ? selected === null : !writtenAnswer.trim()
            }
          >
            Confirm Answer
          </Button>
        ) : (
          <Button
            mode="contained"
            buttonColor={brand.primary}
            style={S.btn}
            contentStyle={{ height: 50 }}
            labelStyle={{ fontSize: 15, fontWeight: "700" }}
            onPress={handleNext}
            loading={submitting}
          >
            {current >= total ? "Finish Quiz" : "Next Question"}
          </Button>
        )}
      </View>
    </ExpressiveScreen>
  );
}

const S = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", padding: 32, minHeight: 300 },
  progressBar: { height: 6, borderRadius: 3, marginHorizontal: 16, marginTop: 4 },
  cardArea: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  questionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  label: { fontSize: 11, fontWeight: "700", marginBottom: 8, letterSpacing: 1 },
  qText: { fontSize: 17, fontWeight: "600", lineHeight: 24 },
  hintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  explanationCard: {
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  encouragement: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  scoreRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  btn: { borderRadius: 14 },
});

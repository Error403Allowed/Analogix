import React, { useMemo, useState, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Text, useTheme, Card, Button, ProgressBar, ActivityIndicator, TextInput } from "react-native-paper";
import { useMutation, useQuery } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
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
  const options = rawOptions.map((option: any, optionIndex: number) => {
    const text = String(option?.text ?? option?.label ?? option?.answer ?? option ?? "");
    return {
      id: String(option?.id ?? `${raw?.id ?? index}-option-${optionIndex}`),
      text,
      isCorrect: Boolean(option?.isCorrect ?? option?.correct ?? (correctAnswer && text === correctAnswer)),
    };
  }).filter((option: QuizOption) => option.text.trim());

  return {
    id: String(raw?.id ?? `question-${index + 1}`),
    type: String(raw?.type ?? (options.length ? "multiple_choice" : "short_answer")),
    question: String(raw?.question ?? raw?.prompt ?? raw?.text ?? ""),
    options,
    correctAnswer: correctAnswer || options.find((option: QuizOption) => option.isCorrect)?.text || "",
    explanation: raw?.explanation ?? null,
    hint: raw?.hint ?? null,
  };
}

function answersMatch(userAnswer: string, correctAnswer: string) {
  const clean = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  return clean(userAnswer) !== "" && clean(userAnswer) === clean(correctAnswer);
}

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

  const question = questions[idx];
  const current = idx + 1;
  const total = questions.length;

  useEffect(() => {
    if (!quizStartRef.current && questions.length > 0) {
      quizStartRef.current = Date.now();
    }
  }, [questions.length]);

  const handleConfirm = () => {
    if (!question || confirmed) return;
    const opt = selected !== null ? question.options[selected] : null;
    const userAnswer = question.options.length > 0 ? opt?.text ?? "" : writtenAnswer.trim();
    const correctAnswer = question.correctAnswer || question.options.find((o) => o.isCorrect)?.text || "";
    const isCorrect = question.options.length > 0 ? Boolean(opt?.isCorrect) : answersMatch(userAnswer, correctAnswer);
    setAnswers((prev) => [...prev, {
      id: question.id,
      question: question.question,
      correctAnswer,
      userAnswer,
      isCorrect,
    }]);
    setConfirmed(true);
  };

  const handleNext = async () => {
    if (submittingRef.current) return;
    if (current >= total) {
      submittingRef.current = true;
      try {
        const elapsedSeconds = Math.round((Date.now() - (quizStartRef.current ?? Date.now())) / 1000);
        await submitAttempt({ variables: { quizId, answers, durationSeconds: elapsedSeconds } });
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
    setIdx(i => i + 1);
    setSelected(null);
    setWrittenAnswer("");
    setConfirmed(false);
  };

  if (loading) {
    return (
      <ExpressiveScreen title="Quiz" onBack={() => navigation.goBack()} scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
        <View style={S.center}><ActivityIndicator size="large" /></View>
      </ExpressiveScreen>
    );
  }

  if (error) {
    return (
      <ExpressiveScreen title="Quiz" onBack={() => navigation.goBack()} scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
        <View style={S.center}>
          <ExpressiveEmptyState icon="alert-circle" title="Could not load quiz" subtitle="Check your connection and try again." />
          <Button mode="contained" buttonColor={brand.primary} style={{ marginTop: 16, borderRadius: 12 }} onPress={() => refetch()}>
            Retry
          </Button>
        </View>
      </ExpressiveScreen>
    );
  }

  if (total === 0 && !loading) {
    return (
      <ExpressiveScreen title="Quiz" onBack={() => navigation.goBack()} scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
        <View style={S.center}>
          <ExpressiveEmptyState icon="help-circle" title="No questions available" subtitle="This quiz does not contain readable questions. Try generating a new quiz." />
          <Button mode="contained" buttonColor={brand.primary} style={{ marginTop: 16, borderRadius: 12 }} onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </ExpressiveScreen>
    );
  }

  if (!question && total > 0) {
    return (
      <ExpressiveScreen title="Quiz" onBack={() => navigation.goBack()} scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
        <View style={S.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}>Loading question...</Text>
        </View>
      </ExpressiveScreen>
    );
  }

  return (
    <ExpressiveScreen title="Quiz" subtitle={`Question ${current} of ${total}`} onBack={() => navigation.goBack()} scroll={false} contentStyle={{ padding: 0, gap: 0 }}>
      <ProgressBar progress={current / total} color={brand.primary} style={S.progressBar} />
      <ScrollView style={S.scrollArea} contentContainerStyle={S.scrollContent}>
          <Card mode="elevated" style={S.questionCard}>
            <Card.Content>
              <Text style={[S.label, { color: paperTheme.colors.onSurfaceVariant }]}>Question {current}</Text>
              <Text style={[S.qText, { color: paperTheme.colors.onSurface }]}>
                {question.question}
              </Text>
              {question.hint && !confirmed ? (
                <Text style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 12 }}>
                  Hint: {question.hint}
                </Text>
              ) : null}
            </Card.Content>
          </Card>

          {(question.options ?? []).length === 0 ? (
            <Card mode="outlined" style={S.optionCard}>
              <Card.Content>
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
                  <Text style={{ marginTop: 12, color: answersMatch(writtenAnswer, question.correctAnswer) ? "#10b981" : "#ef4444" }}>
                    Correct answer: {question.correctAnswer}
                  </Text>
                ) : null}
              </Card.Content>
            </Card>
          ) : (question.options ?? []).map((opt: any, i: number) => {
            const isSel = selected === i;
            const showCorrect = confirmed && opt.isCorrect;
            const showWrong = confirmed && !opt.isCorrect && isSel;
            return (
              <Pressable key={opt.id ?? i} onPress={() => !confirmed && setSelected(i)} disabled={confirmed}>
                <Card mode="outlined" style={[S.optionCard, {
                  backgroundColor: showCorrect ? "#10b98118" : showWrong ? "#ef444418" : isSel ? brand.primary + "15" : paperTheme.colors.surface,
                  borderColor: showCorrect ? "#10b981" : showWrong ? "#ef4444" : isSel ? brand.primary : paperTheme.colors.outline,
                }]}>
                  <Card.Content style={{ paddingVertical: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={[S.radio, { borderColor: showCorrect ? "#10b981" : showWrong ? "#ef4444" : isSel ? brand.primary : paperTheme.colors.outline }]}>
                        {isSel && <View style={[S.radioInner, { backgroundColor: showCorrect ? "#10b981" : showWrong ? "#ef4444" : brand.primary }]} />}
                      </View>
                      <Text style={{ flex: 1, fontSize: 15, color: paperTheme.colors.onSurface, fontWeight: isSel ? "600" : "400" }}>
                        {opt.text}
                      </Text>
                      {showCorrect ? <Icon name="check-circle" size={20} color="#10b981" /> : showWrong ? <Icon name="close-circle" size={20} color="#ef4444" /> : null}
                    </View>
                  </Card.Content>
                </Card>
              </Pressable>
            );
          })}
          {confirmed && question.explanation ? (
            <Card mode="outlined" style={[S.optionCard, { backgroundColor: brand.primary + "10" }]}>
              <Card.Content>
                <Text style={{ color: paperTheme.colors.onSurface, lineHeight: 21 }}>
                  {question.explanation}
                </Text>
              </Card.Content>
            </Card>
          ) : null}
        </ScrollView>

        <View style={S.footer}>
          {!confirmed ? (
            <Button
              mode="contained"
              buttonColor={brand.primary}
              style={S.btn}
              contentStyle={{ height: 48 }}
              onPress={handleConfirm}
              disabled={question.options.length > 0 ? selected === null : !writtenAnswer.trim()}
            >
              Confirm Answer
            </Button>
          ) : (
            <Button mode="contained" buttonColor={brand.primary} style={S.btn} contentStyle={{ height: 48 }} onPress={handleNext} loading={submitting}>
              {current >= total ? "Finish Quiz" : "Next Question"}
            </Button>
          )}
        </View>
    </ExpressiveScreen>
  );
}

const S = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  progressBar: { height: 6, borderRadius: 3, marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  scrollArea: { flex: 1, paddingHorizontal: 16 },
  scrollContent: { gap: 12, paddingTop: 12, paddingBottom: 16 },
  questionCard: { borderRadius: 16 },
  optionCard: { borderRadius: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 11, fontWeight: "700", color: "#666", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  qText: { fontSize: 18, fontWeight: "600", lineHeight: 26 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#ddd" },
  btn: { borderRadius: 12 },
});

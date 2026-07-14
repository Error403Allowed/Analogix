import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text, useTheme, FAB, Portal, Modal, Button, TextInput, SegmentedButtons, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigation } from "@react-navigation/native";
import { QUIZZES, GENERATE_QUIZ, ATTEMPTS } from "../../graphql/queries/quiz";
import { EXTRACT_TEXT } from "../../graphql/queries/ai";
import { ME } from "../../graphql/queries/user";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import { ExpressiveScreen, ExpressiveEmptyState, ExpressiveCard } from "../../components/expressive";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Difficulty = "easy" | "medium" | "hard";
type QuestionType = "mixed" | "multiple_choice" | "short_answer";
const RECENT_QUESTIONS_KEY = "quizRecentQuestions";

function getDifficultyLabels(yearLevel?: number): { value: Difficulty; label: string }[] {
  if (!yearLevel || yearLevel <= 8) {
    return [
      { value: "easy", label: "Foundational" },
      { value: "medium", label: "Building" },
      { value: "hard", label: "Developing" },
    ];
  }
  if (yearLevel <= 10) {
    return [
      { value: "easy", label: "Consolidating" },
      { value: "medium", label: "Extending" },
      { value: "hard", label: "Mastering" },
    ];
  }
  return [
    { value: "easy", label: "Refining" },
    { value: "medium", label: "Analysing" },
    { value: "hard", label: "Evaluating" },
  ];
}

export default function QuizScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const c = paperTheme.colors as any;
  const navigation = useNavigation<any>();

  const [showGenerate, setShowGenerate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionType, setQuestionType] = useState<QuestionType>("mixed");
  const [count, setCount] = useState("10");
  const [pasteText, setPasteText] = useState("");
  const [timed, setTimed] = useState(0);
  const [showStats, setShowStats] = useState<string | null>(null);
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);

  const { data, loading, error, refetch } = useQuery(QUIZZES);
  const { data: attemptsData } = useQuery(ATTEMPTS, {
    variables: showStats ? { quizId: showStats } : {},
    skip: !showStats,
  });
  const { data: meData } = useQuery(ME);
  const yearLevel = meData?.me?.yearLevel;
  const [generateQuiz, { loading: generating }] = useMutation(GENERATE_QUIZ);
  const [extractText] = useMutation(EXTRACT_TEXT);

  const difficultyOptions = getDifficultyLabels(yearLevel);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_QUESTIONS_KEY).then((v) => {
      if (v) try { setRecentQuestions(JSON.parse(v)); } catch { /* noop */ }
    });
  }, []);

  const quizzes = data?.quizzes ?? [];
  const attempts = attemptsData?.attempts ?? [];

  const handleGenerate = async () => {
    try {
      const diversitySeed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const { data: result } = await generateQuiz({
        variables: {
          input: {
            subject: subject || undefined,
            topic: topic || undefined,
            difficulty,
            questionType: questionType === "mixed" ? undefined : questionType,
            questionCount: Math.min(30, Math.max(1, parseInt(count, 10) || 10)),
            diversitySeed,
            excludeQuestions: recentQuestions.slice(-50),
          },
        },
      });
      setShowGenerate(false);
      setSubject("");
      setTopic("");
      if (result?.generateQuiz) {
        const newQs = (result.generateQuiz.questions ?? []).map((q: any) => q.question).filter(Boolean);
        const updated = [...recentQuestions, ...newQs].slice(-100);
        setRecentQuestions(updated);
        AsyncStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(updated));

        navigation.navigate("QuizSession", {
          quizId: result.generateQuiz.id,
          quizTitle: result.generateQuiz.title,
          questions: result.generateQuiz.questions,
          subjectId: result.generateQuiz.subjectId,
          timedDuration: timed,
        });
      }
    } catch (err) {
      console.error("Failed to generate quiz:", err);
    }
  };

  const handleImportFromText = useCallback(async () => {
    const trimmed = pasteText.trim();
    if (trimmed.length < 50) { Alert.alert("Not enough text", "Please provide at least 50 characters."); return; }
    try {
      const { data: result } = await generateQuiz({
        variables: {
          input: {
            text: trimmed.substring(0, 12000),
            subject: subject || undefined,
            difficulty,
            questionCount: Math.min(20, Math.max(1, parseInt(count, 10) || 10)),
          },
        },
      });
      setShowImport(false);
      setPasteText("");
      if (result?.generateQuiz) {
        navigation.navigate("QuizSession", {
          quizId: result.generateQuiz.id,
          quizTitle: result.generateQuiz.title,
          questions: result.generateQuiz.questions,
          subjectId: result.generateQuiz.subjectId,
          timedDuration: timed,
        });
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not generate quiz.");
    }
  }, [pasteText, subject, difficulty, count, generateQuiz, navigation, timed]);

  const handleImportFromFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const raw = await readAsStringAsync(file.uri, { encoding: "base64" });
      const { data: extracted } = await extractText({
        variables: { input: { base64: raw, fileName: file.name, mimeType: file.mimeType ?? "text/plain" } },
      });
      const textContent = extracted?.extractText?.text ?? "";
      if (textContent.length < 50) { Alert.alert("Not enough text", "Could not extract enough text."); return; }
      const { data: genResult } = await generateQuiz({
        variables: {
          input: {
            text: textContent.substring(0, 12000),
            subject: subject || undefined,
            difficulty,
            questionCount: Math.min(20, Math.max(1, parseInt(count, 10) || 10)),
          },
        },
      });
      setShowImport(false);
      if (genResult?.generateQuiz) {
        navigation.navigate("QuizSession", {
          quizId: genResult.generateQuiz.id,
          quizTitle: genResult.generateQuiz.title,
          questions: genResult.generateQuiz.questions,
          subjectId: genResult.generateQuiz.subjectId,
          timedDuration: timed,
        });
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not process file.");
    }
  }, [subject, difficulty, count, generateQuiz, extractText, navigation, timed]);

  const averageAccuracy = attempts.length > 0
    ? Math.round(attempts.reduce((sum: number, a: any) => sum + (a.accuracy ?? 0), 0) / attempts.length)
    : 0;

  return (
    <ExpressiveScreen
      title="Quizzes"
      subtitle={`${quizzes.length} quiz${quizzes.length !== 1 ? "zes" : ""}`}
      leadingIcon="help-circle"
      onBack={() => navigation.goBack()}
      actions={
        <Pressable onPress={() => setShowImport(true)} style={styles.iconBtn}>
          <Icon name="file-upload" size={20} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
      }
      fab={
        <FAB icon="plus" label="Generate" color="#fff" style={{ backgroundColor: brand.primary, borderRadius: SHAPE.lg }} onPress={() => setShowGenerate(true)} />
      }
    >
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.centerState}>
          <ExpressiveEmptyState icon="alert-circle" title="Could not load quizzes" subtitle="Check your connection and try again." />
          <Button mode="contained" buttonColor={brand.primary} onPress={() => refetch()} style={{ borderRadius: SHAPE.lg }}>
            Retry
          </Button>
        </View>
      ) : quizzes.length === 0 ? (
        <ExpressiveEmptyState icon="help-circle" title="No quizzes yet" subtitle="Tap Generate to create your first quiz." />
      ) : (
        <View style={{ gap: 8 }}>
          {quizzes.map((q: any, i: number) => (
            <Animated.View key={q.id} entering={FadeInDown.duration(300).delay(i * 80).springify()}>
            <ExpressiveCard tone="low" onPress={() => navigation.navigate("QuizSession", { quizId: q.id, questions: q.questions, quizTitle: q.title, subjectId: q.subjectId })}>
              <View style={styles.quizRow}>
                <View style={[styles.iconWrap, { backgroundColor: brand.primary + "18" }]}>
                  <Icon name="help-circle" size={22} color={brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{q.title ?? q.subject}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{q.questions?.length ?? 0} questions</Text>
                    {q.difficulty && (
                      <Text variant="bodySmall" style={{ color: q.difficulty === "hard" ? "#ef4444" : q.difficulty === "easy" ? "#10b981" : "#f59e0b" }}>
                        {q.difficulty}
                      </Text>
                    )}
                  </View>
                </View>
                <Pressable onPress={() => setShowStats(showStats === q.id ? null : q.id)} hitSlop={8}>
                  <Icon name="chart-bar" size={20} color={showStats === q.id ? brand.primary : paperTheme.colors.onSurfaceVariant} />
                </Pressable>
              </View>
              {showStats === q.id && (
                <View style={[styles.statsRow, { borderTopColor: c.outlineVariant, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 8 }]}>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                    {attempts.length > 0 ? `${Math.round(averageAccuracy)}% avg accuracy · ${attempts.length} attempts` : "No attempts yet"}
                  </Text>
                </View>
              )}
            </ExpressiveCard>
            </Animated.View>
          ))}
        </View>
      )}

      <Portal>
        <Modal visible={showGenerate} onDismiss={() => setShowGenerate(false)} contentContainerStyle={[styles.modal, { backgroundColor: c.surface ?? paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 16 }}>Generate quiz</Text>
          <TextInput mode="outlined" label="Subject" placeholder="e.g. Biology" value={subject} onChangeText={setSubject} style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Topic" placeholder="e.g. Cell division" value={topic} onChangeText={setTopic} style={{ marginBottom: 12 }} />
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 6 }}>Difficulty</Text>
          <SegmentedButtons
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as Difficulty)}
            buttons={difficultyOptions.map(opt => ({ value: opt.value, label: opt.label }))}
            style={{ marginBottom: 12 }}
            density="small"
          />
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 6 }}>Question type</Text>
          <SegmentedButtons
            value={questionType}
            onValueChange={(v) => setQuestionType(v as QuestionType)}
            buttons={[
              { value: "mixed", label: "Mixed" },
              { value: "multiple_choice", label: "MCQ" },
              { value: "short_answer", label: "Written" },
            ]}
            style={{ marginBottom: 12 }}
            density="small"
          />
          <TextInput mode="outlined" label="Question count" value={count} onChangeText={setCount} keyboardType="number-pad" style={{ marginBottom: 12 }} />
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 6 }}>Timer</Text>
          <SegmentedButtons
            value={String(timed)}
            onValueChange={(v) => setTimed(Number(v))}
            buttons={[
              { value: "0", label: "Off" },
              { value: "5", label: "5 min" },
              { value: "10", label: "10 min" },
              { value: "15", label: "15 min" },
            ]}
            style={{ marginBottom: 16 }}
            density="small"
          />
          <Button mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg }} onPress={handleGenerate} loading={generating} disabled={generating}>
            Generate
          </Button>
        </Modal>
      </Portal>

      <Portal>
        <Modal visible={showImport} onDismiss={() => setShowImport(false)} contentContainerStyle={[styles.modal, { backgroundColor: c.surface ?? paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 16 }}>Import content</Text>
          <Button mode="outlined" icon="file-upload" style={{ marginBottom: 12, borderRadius: SHAPE.md }} onPress={handleImportFromFile}>
            Upload document
          </Button>
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 8 }}>or paste text below</Text>
          <TextInput mode="outlined" label="Paste content" value={pasteText} onChangeText={setPasteText} multiline style={{ minHeight: 120, marginBottom: 12 }} />
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 6 }}>Difficulty</Text>
          <SegmentedButtons
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as Difficulty)}
            buttons={[{ value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }]}
            style={{ marginBottom: 12 }}
            density="small"
          />
          <Button mode="contained" buttonColor={brand.primary} loading={generating} onPress={handleImportFromText} disabled={pasteText.trim().length < 50}>
            Generate Quiz
          </Button>
        </Modal>
      </Portal>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  quizRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: SHAPE.md, alignItems: "center", justifyContent: "center" },
  statsRow: { marginTop: 4 },
  centerState: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 12 },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },
});

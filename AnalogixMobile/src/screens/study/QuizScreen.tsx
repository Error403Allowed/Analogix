/**
 * Quiz hub — list of past quizzes + "Generate new" CTA.
 */
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { Text, useTheme, Button, ActivityIndicator, Modal, Portal, TextInput, Chip, IconButton } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { QUIZZES, GENERATE_QUIZ } from "../../graphql/queries/quiz";
import { ME } from "../../graphql/queries/user";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize } from "../../hooks/useResponsive";
import Icon from "../../components/Icon";

export default function QuizScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const size = useScreenSize();
  const isCompact = size === "compact";
  const me = useQuery(ME);
  const quizzes = useQuery(QUIZZES);
  const [showNew, setShowNew] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState("5");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [generateQuiz, { loading: generating }] = useMutation(GENERATE_QUIZ);

  const subjects = me.data?.me?.subjects ?? [];
  const list = quizzes.data?.quizzes ?? [];

  const handleGenerate = async () => {
    const { data } = await generateQuiz({
      variables: {
        input: {
          topic: topic.trim(),
          subjectId,
          numQuestions: Number(numQuestions) || 5,
          difficulty,
          types: ["multiple_choice"],
        },
      },
    });
    if (data?.generateQuiz?.id) {
      setShowNew(false);
      setTopic("");
      navigation.navigate("QuizSession", { quizId: data.generateQuiz.id, title: data.generateQuiz.title });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.header, { paddingTop: isCompact ? 40 : 56 }]}>
        <View>
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>Time to test</Text>
          <Text variant={isCompact ? "headlineMedium" : "headlineLarge"} style={styles.title}>Quizzes</Text>
        </View>
        <IconButton icon="plus-circle" iconColor={brand.primary} size={28} onPress={() => setShowNew(true)} />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={quizzes.loading} onRefresh={quizzes.refetch} tintColor={brand.primary} />}
      >
        {quizzes.loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="clipboard-list-outline" size={64} color={paperTheme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 16 }}>
              No quizzes yet. Tap + to generate one.
            </Text>
          </View>
        ) : (
          list.map((q: any) => (
            <Pressable key={q.id} onPress={() => navigation.navigate("QuizSession", { quizId: q.id, title: q.title })}>
              <View style={[styles.row, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
                <View style={[styles.iconWrap, { backgroundColor: `${brand.secondary}22` }]}>
                  <Icon name="clipboard-list" size={24} color={brand.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall">{q.title}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                    {q.questions.length} questions · {q.difficulty}
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color={paperTheme.colors.onSurfaceVariant} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={showNew}
          onDismiss={() => setShowNew(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.xl }]}
        >
          <Text variant="titleLarge" style={{ fontWeight: "800" }}>Generate quiz</Text>
          <TextInput label="Topic" value={topic} onChangeText={setTopic} mode="outlined" style={styles.input} />
          <TextInput label="Number of questions" value={numQuestions} onChangeText={setNumQuestions} mode="outlined" keyboardType="numeric" style={styles.input} />
          <Text variant="bodySmall" style={{ marginTop: 8, color: paperTheme.colors.onSurfaceVariant }}>Difficulty</Text>
          <View style={styles.chips}>
            {(["easy", "medium", "hard"] as const).map((d) => (
              <Chip key={d} selected={difficulty === d} onPress={() => setDifficulty(d)} style={[styles.chip, { borderRadius: SHAPE.lg }]} mode="outlined">{d}</Chip>
            ))}
          </View>
          <Text variant="bodySmall" style={{ marginTop: 8, color: paperTheme.colors.onSurfaceVariant }}>Subject</Text>
          <View style={styles.chips}>
            {subjects.map((s: string) => (
              <Chip key={s} selected={subjectId === s} onPress={() => setSubjectId(s)} style={[styles.chip, { borderRadius: SHAPE.lg }]} mode="outlined">{s}</Chip>
            ))}
          </View>
          <View style={styles.modalActions}>
            <Button onPress={() => setShowNew(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleGenerate} loading={generating} disabled={!topic.trim() || !subjectId}>
              Generate
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontWeight: "900" },
  list: { paddingHorizontal: 20, paddingBottom: 100, gap: 8 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, marginBottom: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  modal: { margin: 24, padding: 24 },
  input: { marginTop: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { marginRight: 8, marginBottom: 4 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 16 },
});

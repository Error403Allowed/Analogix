import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, useTheme, Card, Button, ProgressBar, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { QUIZZES } from "../../graphql/queries/quiz";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";

export default function QuizSessionScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { quizId } = route.params;
  const { data, loading } = useQuery(QUIZZES);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const quizzes = data?.quizzes ?? [];
  const quiz = quizzes.find((q: any) => q.id === quizId);
  const questions = quiz?.questions ?? [];
  const question = questions[idx];

  const handleSelect = (optIdx: number) => {
    if (selected !== null) return;
    setSelected(optIdx);
  };

  const next = () => {
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      setSelected(null);
    } else {
      navigation.navigate("QuizResults", { quizId });
    }
  };

  if (loading || !question) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
        <IconButton icon="close" onPress={() => navigation.goBack()} accessibilityLabel="Close quiz" />
        <Text variant="titleMedium" style={{ fontWeight: "700", flex: 1 }}>{quiz?.title ?? "Quiz"}</Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>{idx + 1}/{questions.length}</Text>
      </View>

      <ProgressBar progress={(idx + 1) / questions.length} color={brand.primary} style={[styles.progress, { backgroundColor: paperTheme.colors.surfaceVariant }]} />

      <View style={styles.content}>
        <Card mode="elevated" style={styles.questionCard}>
          <Card.Content>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>Question {idx + 1}</Text>
            <Text variant="titleLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>
              {question.question}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.options}>
          {(question.options ?? []).map((opt: any, i: number) => {
            const isSelected = selected === i;
            return (
              <Pressable
                key={opt.id ?? i}
                onPress={() => handleSelect(i)}
                disabled={selected !== null}
                accessibilityLabel={`Option ${i + 1}: ${opt.text ?? opt}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <Card
                  mode="outlined"
                  style={[
                    styles.option,
                    {
                      backgroundColor: isSelected ? brand.primary + "18" : paperTheme.colors.surface,
                      borderColor: isSelected ? brand.primary : paperTheme.colors.outline,
                    },
                  ]}
                >
                  <Card.Content style={styles.optionContent}>
                    <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurface, fontWeight: isSelected ? "700" : "400" }}>
                      {opt.text ?? opt}
                    </Text>
                  </Card.Content>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selected !== null && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg }} onPress={next} contentStyle={{ height: 48 }}>
            {idx < questions.length - 1 ? "Next" : "See results"}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  progress: { height: 6, marginHorizontal: 16, borderRadius: SHAPE.xs },
  content: { flex: 1, padding: 16, gap: 16 },
  questionCard: { borderRadius: SHAPE.lg },
  options: { gap: 8 },
  option: { borderRadius: SHAPE.lg },
  optionContent: { paddingVertical: 14 },
  footer: { padding: 16 },
});

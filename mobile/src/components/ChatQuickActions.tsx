import React, { useState } from "react";
import { View, Pressable, StyleSheet, Alert } from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { useMutation } from "@apollo/client";
import { GENERATE_FLASHCARDS } from "../graphql/queries/flashcard";
import { GENERATE_QUIZ } from "../graphql/queries/quiz";
import { useNavigation } from "@react-navigation/native";

interface Props {
  content: string;
}

export function ChatQuickActions({ content }: Props) {
  const theme = useTheme();
  const c = theme.colors as any;
  const navigation = useNavigation<any>();

  const [generateFlashcards, { loading: fcLoading }] = useMutation(GENERATE_FLASHCARDS);
  const [generateQuiz, { loading: qzLoading }] = useMutation(GENERATE_QUIZ);
  const [fcDone, setFcDone] = useState(false);
  const [qzDone, setQzDone] = useState(false);

  const handleFlashcards = async () => {
    if (fcDone) return;
    try {
      const { data } = await generateFlashcards({
        variables: { input: { conversation: content } },
      });
      if (data?.generateFlashcards) {
        setFcDone(true);
        Alert.alert(
          "Flashcards Created",
          `${data.generateFlashcards.length} flashcards generated from this conversation.`,
          [
            { text: "OK", style: "default" },
            {
              text: "View Flashcards",
              onPress: () => navigation.navigate("Study", { screen: "Flashcards" }),
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to generate flashcards");
    }
  };

  const handleQuiz = async () => {
    if (qzDone) return;
    try {
      const { data } = await generateQuiz({
        variables: { input: { conversation: content } },
      });
      if (data?.generateQuiz) {
        setQzDone(true);
        Alert.alert(
          "Quiz Created",
          `"${data.generateQuiz.title}" with ${data.generateQuiz.questions?.length} questions.`,
          [
            { text: "OK", style: "default" },
            {
              text: "Take Quiz",
              onPress: () => navigation.navigate("Study", { screen: "Quiz" }),
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to generate quiz");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Quick Actions</Text>
      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? c.primaryContainer : "transparent", borderColor: c.outline },
            fcDone && { opacity: 0.5 },
          ]}
          onPress={handleFlashcards}
          disabled={fcLoading || fcDone}
        >
          {fcLoading ? (
            <ActivityIndicator size={12} color={c.primary} />
          ) : (
            <Text style={[styles.buttonText, { color: c.primary }]}>
              {fcDone ? "Created!" : "Flashcards"}
            </Text>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? c.primaryContainer : "transparent", borderColor: c.outline },
            qzDone && { opacity: 0.5 },
          ]}
          onPress={handleQuiz}
          disabled={qzLoading || qzDone}
        >
          {qzLoading ? (
            <ActivityIndicator size={12} color={c.primary} />
          ) : (
            <Text style={[styles.buttonText, { color: c.primary }]}>
              {qzDone ? "Created!" : "Quiz"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  buttons: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

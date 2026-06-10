import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { Text, useTheme, IconButton, Card, Button, FAB, Portal, Modal, TextInput, ActivityIndicator, SegmentedButtons, ProgressBar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  FLASHCARDS,
  CREATE_FLASHCARD,
  DELETE_FLASHCARD,
  GENERATE_FLASHCARDS,
  UPDATE_FLASHCARD,
} from "../../graphql/queries/flashcard";
import { EXTRACT_TEXT } from "../../graphql/queries/ai";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import { SkeletonList } from "../../components/SkeletonLoader";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";

type SetTab = "flashcards" | "learn";

export default function FlashcardSetScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const c = paperTheme.colors as any;
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { setId, name, subjectId } = route.params;

  const { data, loading, refetch } = useQuery(FLASHCARDS, { variables: { setId } });
  const [createCard, { loading: creating }] = useMutation(CREATE_FLASHCARD);
  const [deleteCard] = useMutation(DELETE_FLASHCARD);
  const [generateCards, { loading: generating }] = useMutation(GENERATE_FLASHCARDS);
  const [updateFlashcard] = useMutation(UPDATE_FLASHCARD);
  const [extractText] = useMutation(EXTRACT_TEXT);

  const [tab, setTab] = useState<SetTab>("flashcards");
  const [showAdd, setShowAdd] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [topic, setTopic] = useState("");
  const [genCount, setGenCount] = useState("8");
  const [pasteText, setPasteText] = useState("");

  const [learnIdx, setLearnIdx] = useState(0);
  const [learnFlipped, setLearnFlipped] = useState(false);
  const [learnAnswers, setLearnAnswers] = useState<("correct" | "incorrect" | null)[]>([]);
  const [learnComplete, setLearnComplete] = useState(false);

  const cards = data?.flashcards ?? [];

  const learnCards = useMemo(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    return shuffled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  const handleAdd = async () => {
    if (!front.trim() || !back.trim()) return;
    try {
      await createCard({
        variables: { input: { subjectId: subjectId ?? "general", setId, front: front.trim(), back: back.trim() } },
      });
      setFront(""); setBack(""); setShowAdd(false); refetch();
    } catch (e: any) { Alert.alert("Error", e.message ?? "Could not add card."); }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    try {
      const { data: generated } = await generateCards({
        variables: { input: { topic: topic.trim(), subjectId: subjectId ?? "general", count: Math.min(50, Math.max(1, parseInt(genCount, 10) || 8)) } },
      });
      const created = generated?.generateFlashcards ?? [];
      await Promise.all(created.map((card: { id: string }) => updateFlashcard({ variables: { input: { id: card.id, setId } } })));
      setTopic(""); setShowGenerate(false); refetch();
    } catch (e: any) { Alert.alert("Error", e.message ?? "Could not generate flashcards."); }
  };

  const handleImportFromText = useCallback(async () => {
    const trimmed = pasteText.trim();
    if (trimmed.length < 20) { Alert.alert("Not enough text", "Please provide at least 20 characters."); return; }
    try {
      const { data: generated } = await generateCards({
        variables: { input: { text: trimmed.substring(0, 12000), subjectId: subjectId ?? "general", count: 10 } },
      });
      const created = generated?.generateFlashcards ?? [];
      await Promise.all(created.map((card: { id: string }) => updateFlashcard({ variables: { input: { id: card.id, setId } } })));
      setPasteText(""); setShowImport(false); refetch();
      Alert.alert("Done", `${created.length} flashcards generated from your content.`);
    } catch (e: any) { Alert.alert("Error", e.message ?? "Could not generate flashcards."); }
  }, [pasteText, subjectId, generateCards, updateFlashcard, refetch, setId]);

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
      if (textContent.length < 20) { Alert.alert("Not enough text", "Could not extract enough text from the file."); return; }
      const { data: generated } = await generateCards({
        variables: { input: { text: textContent.substring(0, 12000), subjectId: subjectId ?? "general", count: 10 } },
      });
      const created = generated?.generateFlashcards ?? [];
      await Promise.all(created.map((card: { id: string }) => updateFlashcard({ variables: { input: { id: card.id, setId } } })));
      refetch();
      Alert.alert("Done", `${created.length} flashcards generated from "${file.name}".`);
    } catch (e: any) { Alert.alert("Error", e.message ?? "Could not process file."); }
  }, [subjectId, generateCards, updateFlashcard, refetch, setId, extractText]);

  const handleDelete = (id: string) => {
    Alert.alert("Delete card", "Remove this flashcard?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteCard({ variables: { id } }); refetch(); } },
    ]);
  };

  // ─── Learn mode handlers ───────────────────────────────────────────────
  const resetLearn = useCallback(() => {
    setLearnIdx(0); setLearnFlipped(false); setLearnAnswers([]); setLearnComplete(false);
  }, []);

  const handleLearnAnswer = useCallback((correct: boolean) => {
    const updated = [...learnAnswers];
    updated[learnIdx] = correct ? "correct" : "incorrect";
    setLearnAnswers(updated);
    if (learnIdx + 1 >= learnCards.length) {
      setLearnComplete(true);
    } else {
      setLearnIdx(i => i + 1);
      setLearnFlipped(false);
    }
  }, [learnAnswers, learnIdx, learnCards.length]);

  const correctCount = learnAnswers.filter(a => a === "correct").length;

  return (
    <View style={[styles.container, { backgroundColor: c.surface ?? paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: c.surfaceContainer ?? paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{ fontWeight: "700", flex: 1 }} numberOfLines={1}>{name ?? "Flashcards"}</Text>
      </View>

      <SegmentedButtons
        value={tab}
        onValueChange={(v) => { setTab(v as SetTab); resetLearn(); }}
        buttons={[{ value: "flashcards", label: "Cards" }, { value: "learn", label: "Learn" }]}
        style={{ marginHorizontal: 12, marginVertical: 8 }}
        density="small"
      />

      {tab === "flashcards" && (
        <>
          <View style={styles.actions}>
            <Button
              mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg, flex: 1 }}
              disabled={cards.length === 0}
              onPress={() => navigation.navigate("FlashcardReview", { setId })}
            >
              Review ({cards.length})
            </Button>
            <Button mode="outlined" style={{ borderRadius: SHAPE.lg }} onPress={() => setShowGenerate(true)}>AI</Button>
            <Button mode="outlined" style={{ borderRadius: SHAPE.lg }} onPress={() => setShowImport(true)}>
              <Icon name="file-upload" size={16} color={brand.primary} />
            </Button>
          </View>

          {loading ? (
            <SkeletonList count={3} style={{ marginTop: 12, marginHorizontal: 12 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {cards.length === 0 ? (
                <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", paddingTop: 40 }}>
                  No cards yet. Tap + to add one or use AI to generate.
                </Text>
              ) : cards.map((c: any) => (
                <Card key={c.id} mode="outlined" style={styles.card}>
                  <Card.Content>
                    <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{c.front}</Text>
                    <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 6 }}>{c.back}</Text>
                  </Card.Content>
                  <Card.Actions>
                    <Button compact textColor={paperTheme.colors.error} onPress={() => handleDelete(c.id)}>Delete</Button>
                  </Card.Actions>
                </Card>
              ))}
            </ScrollView>
          )}

          <FAB icon="plus" color="#fff" style={[styles.fab, { backgroundColor: brand.primary }]} onPress={() => setShowAdd(true)} />
        </>
      )}

      {tab === "learn" && (
        <ScrollView contentContainerStyle={{ flex: 1, padding: 20 }}>
          {learnComplete ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
              <Icon name="check-circle" size={64} color={brand.primary} />
              <Text variant="headlineSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>
                {correctCount} of {learnCards.length} correct
              </Text>
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}>
                {correctCount === learnCards.length ? "Perfect score!" : "Keep practising to improve."}
              </Text>
              <Button mode="contained" buttonColor={brand.primary} onPress={resetLearn}>Try Again</Button>
            </View>
          ) : learnCards.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", paddingTop: 40 }}>
              No cards in this set.
            </Text>
          ) : (
            <>
              <ProgressBar
                progress={(learnIdx + 1) / learnCards.length}
                color={brand.primary}
                style={[styles.progress, { backgroundColor: paperTheme.colors.surfaceVariant }]}
              />
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginVertical: 8 }}>
                {learnIdx + 1} / {learnCards.length}
              </Text>

              <Pressable onPress={() => setLearnFlipped(!learnFlipped)} style={{ flex: 1, justifyContent: "center" }}>
                <Card mode="elevated" style={styles.learnCard}>
                  <Card.Content style={styles.learnCardContent}>
                    <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 12 }}>
                      {learnFlipped ? "Answer" : "Question"}
                    </Text>
                    <Text variant="headlineSmall" style={{ fontWeight: "600", color: paperTheme.colors.onSurface, textAlign: "center" }}>
                      {learnFlipped ? learnCards[learnIdx]?.back : learnCards[learnIdx]?.front}
                    </Text>
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 24 }}>
                      Tap to flip
                    </Text>
                  </Card.Content>
                </Card>
              </Pressable>

              {learnFlipped && (
                <View style={styles.learnBtns}>
                  <Button
                    mode="outlined" style={{ flex: 1, borderRadius: SHAPE.lg }}
                    textColor={paperTheme.colors.error}
                    onPress={() => handleLearnAnswer(false)}
                  >
                    Still learning
                  </Button>
                  <Button
                    mode="contained" style={{ flex: 1, borderRadius: SHAPE.lg }}
                    buttonColor={brand.primary}
                    onPress={() => handleLearnAnswer(true)}
                  >
                    Got it
                  </Button>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <Portal>
        <Modal visible={showAdd} onDismiss={() => setShowAdd(false)} contentContainerStyle={[styles.modal, { backgroundColor: c.surface ?? paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Add card</Text>
          <TextInput mode="outlined" label="Front" value={front} onChangeText={setFront} style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Back" value={back} onChangeText={setBack} multiline style={{ marginBottom: 16 }} />
          <Button mode="contained" buttonColor={brand.primary} loading={creating} onPress={handleAdd} disabled={!front.trim() || !back.trim()}>Add</Button>
        </Modal>

        <Modal visible={showGenerate} onDismiss={() => setShowGenerate(false)} contentContainerStyle={[styles.modal, { backgroundColor: c.surface ?? paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Generate with AI</Text>
          <TextInput mode="outlined" label="Topic" value={topic} onChangeText={setTopic} style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Count" value={genCount} onChangeText={setGenCount} keyboardType="number-pad" style={{ marginBottom: 16 }} />
          <Button mode="contained" buttonColor={brand.primary} loading={generating} onPress={handleGenerate} disabled={!topic.trim()}>Generate</Button>
        </Modal>

        <Modal visible={showImport} onDismiss={() => setShowImport(false)} contentContainerStyle={[styles.modal, { backgroundColor: c.surface ?? paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Import content</Text>
          <Button mode="outlined" icon="file-upload" style={{ marginBottom: 12, borderRadius: SHAPE.md }} onPress={handleImportFromFile}>
            Upload file
          </Button>
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 8 }}>or paste text below</Text>
          <TextInput mode="outlined" label="Paste content" value={pasteText} onChangeText={setPasteText} multiline style={{ minHeight: 120, marginBottom: 16 }} />
          <Button mode="contained" buttonColor={brand.primary} loading={generating} onPress={handleImportFromText} disabled={pasteText.trim().length < 20}>
            Generate Flashcards
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  actions: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  list: { padding: 12, paddingBottom: 120, gap: 8 },
  card: { borderRadius: SHAPE.lg },
  fab: { position: "absolute", right: 16, bottom: 100, borderRadius: SHAPE.lg },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },

  // Learn mode
  progress: { height: 6, borderRadius: SHAPE.xs, marginBottom: 4 },
  learnCard: { borderRadius: SHAPE.xl, minHeight: 280, justifyContent: "center" },
  learnCardContent: { paddingVertical: 32, alignItems: "center" },
  learnBtns: { flexDirection: "row", gap: 8, marginTop: 16 },
});

import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, useWindowDimensions } from "react-native";
import { Text, useTheme, Card, Button, Portal, Modal, TextInput, SegmentedButtons, ProgressBar, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRoute, useNavigation } from "@react-navigation/native";
import Animated, { useAnimatedStyle, withTiming, FadeInDown } from "react-native-reanimated";
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
import { ExpressiveScreen, ExpressiveEmptyState } from "../../components/expressive";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";

type SetTab = "flashcards" | "learn";

const CARD_H = 280;

function FlipCard({ front, back, flipped, onFlip, cardKey }: {
  front: string; back: string; flipped: boolean; onFlip: () => void; cardKey: string;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 40, 420);
  const r = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1400 },
      { rotateY: withTiming(flipped ? "180deg" : "0deg", { duration: 400 }) },
    ],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    backfaceVisibility: "hidden" as const,
    position: "absolute" as const, width: "100%", height: "100%",
  }));
  const backStyle = useAnimatedStyle(() => ({
    backfaceVisibility: "hidden" as const,
    position: "absolute" as const, width: "100%", height: "100%",
    transform: [{ rotateY: "180deg" }],
  }));

  return (
    <Pressable
      key={cardKey}
      onPress={onFlip}
      style={styles.flipPressable}
      accessibilityRole="button"
      accessibilityLabel={flipped ? "Show flashcard front" : "Show flashcard back"}
    >
      <Animated.View style={[styles.flipFrame, { width: cardWidth, height: CARD_H }, r]}>
        <Animated.View style={frontStyle}>
          <Card mode="elevated" style={styles.flipCard}>
            <Card.Content style={styles.flipCardContent}>
              <Text variant="labelSmall" style={{ color: "#6366f1", textAlign: "center", marginBottom: 8, fontWeight: "700", letterSpacing: 1 }}>
                TERM
              </Text>
              <Text variant="headlineSmall" style={{ fontWeight: "700", color: "#1a1a2e", textAlign: "center", lineHeight: 30 }}>
                {front}
              </Text>
              <Text variant="bodySmall" style={{ color: "#94a3b8", textAlign: "center", marginTop: 16, fontSize: 11 }}>
                Tap to flip
              </Text>
            </Card.Content>
          </Card>
        </Animated.View>
        <Animated.View style={backStyle}>
          <Card mode="elevated" style={[styles.flipCard, { borderColor: "#10b98144" }]}>
            <Card.Content style={styles.flipCardContent}>
              <Text variant="labelSmall" style={{ color: "#10b981", textAlign: "center", marginBottom: 8, fontWeight: "700", letterSpacing: 1 }}>
                DEFINITION
              </Text>
              <Text variant="bodyLarge" style={{ fontWeight: "500", color: "#1a1a2e", textAlign: "center", lineHeight: 24 }}>
                {back}
              </Text>
              <Text variant="bodySmall" style={{ color: "#94a3b8", textAlign: "center", marginTop: 16, fontSize: 11 }}>
                Tap to flip back
              </Text>
            </Card.Content>
          </Card>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function FlashcardSetScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const c = paperTheme.colors as any;
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { setId, name, subjectId } = route.params;

  const { data, loading, error, refetch } = useQuery(FLASHCARDS, { variables: { setId } });
  const [createCard, { loading: creating }] = useMutation(CREATE_FLASHCARD);
  const [deleteCard] = useMutation(DELETE_FLASHCARD);
  const [generateCards, { loading: generating }] = useMutation(GENERATE_FLASHCARDS);
  const [updateFlashcard] = useMutation(UPDATE_FLASHCARD);
  const [extractText] = useMutation(EXTRACT_TEXT);

  const [tab, setTab] = useState<SetTab>("flashcards");
  const [showAdd, setShowAdd] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showEdit, setShowEdit] = useState<string | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [topic, setTopic] = useState("");
  const [genCount, setGenCount] = useState("8");
  const [pasteText, setPasteText] = useState("");

  const [learnIdx, setLearnIdx] = useState(0);
  const [learnFlipped, setLearnFlipped] = useState(false);
  const [learnAnswers, setLearnAnswers] = useState<("correct" | "incorrect" | null)[]>([]);
  const [learnComplete, setLearnComplete] = useState(false);

  const cards = useMemo(() => data?.flashcards ?? [], [data?.flashcards]);

  const learnCards = useMemo(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    return shuffled;
  }, [cards]);

  const handleAdd = async () => {
    if (!front.trim() || !back.trim()) return;
    try {
      await createCard({
        variables: { input: { subjectId: subjectId ?? "general", setId, front: front.trim(), back: back.trim() } },
      });
      setFront(""); setBack(""); setShowAdd(false); refetch();
    } catch (e: any) { Alert.alert("Error", e.message ?? "Could not add card."); }
  };

  const handleEdit = (card: any) => {
    setEditFront(card.front);
    setEditBack(card.back);
    setShowEdit(card.id);
  };

  const handleSaveEdit = async () => {
    if (!showEdit || !editFront.trim() || !editBack.trim()) return;
    try {
      await updateFlashcard({ variables: { input: { id: showEdit, front: editFront.trim(), back: editBack.trim() } } });
      setShowEdit(null); refetch();
    } catch (e: any) { Alert.alert("Error", e.message ?? "Could not update card."); }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    try {
      await generateCards({
        variables: { input: { topic: topic.trim(), subjectId: subjectId ?? "general", setId, count: Math.min(50, Math.max(1, parseInt(genCount, 10) || 8)) } },
      });
      setTopic(""); setShowGenerate(false); refetch();
    } catch (e: any) { Alert.alert("Error", e.message ?? "Could not generate flashcards."); }
  };

  const handleImportFromText = useCallback(async () => {
    const trimmed = pasteText.trim();
    if (trimmed.length < 20) { Alert.alert("Not enough text", "Please provide at least 20 characters."); return; }
    try {
      const { data: generated } = await generateCards({
        variables: { input: { text: trimmed.substring(0, 12000), subjectId: subjectId ?? "general", setId, count: 10 } },
      });
      const count = generated?.generateFlashcards?.length ?? 0;
      setPasteText(""); setShowImport(false); refetch();
      Alert.alert("Done", `${count} flashcards generated from your content.`);
    } catch (e: any) { Alert.alert("Error", e.message ?? "Could not generate flashcards."); }
  }, [pasteText, subjectId, generateCards, refetch, setId]);

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
        variables: { input: { text: textContent.substring(0, 12000), subjectId: subjectId ?? "general", setId, count: 10 } },
      });
      const count = generated?.generateFlashcards?.length ?? 0;
      refetch();
      Alert.alert("Done", `${count} flashcards generated from "${file.name}".`);
    } catch (e: any) { Alert.alert("Error", e.message ?? "Could not process file."); }
  }, [subjectId, generateCards, refetch, setId, extractText]);

  const handleDelete = (id: string) => {
    Alert.alert("Delete card", "Remove this flashcard?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteCard({ variables: { id } }); refetch(); } },
    ]);
  };

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
    <ExpressiveScreen
      title={name ?? "Flashcards"}
      subtitle={`${cards.length} card${cards.length !== 1 ? "s" : ""}`}
      onBack={() => navigation.goBack()}
      scroll={false}
      contentStyle={{ padding: 0, gap: 0 }}
    >
      <View style={{ flex: 1 }}>
        <SegmentedButtons
          value={tab}
          onValueChange={(v) => { setTab(v as SetTab); resetLearn(); }}
          buttons={[{ value: "flashcards", label: "Cards" }, { value: "learn", label: "Learn" }]}
          style={{ marginHorizontal: 12, marginVertical: 8 }}
          density="small"
        />

        {tab === "flashcards" ? (
          <View style={{ flex: 1 }}>
            <View style={styles.actions}>
              <Button
                mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg, flex: 1 }}
                disabled={cards.length === 0}
                onPress={() => navigation.navigate("FlashcardReview", { setId })}
              >
                Review ({cards.length})
              </Button>
              <Pressable onPress={() => setShowAdd(true)} style={[styles.iconBtn, { backgroundColor: brand.primary + "12" }]}>
                <Icon name="plus" size={20} color={brand.primary} />
              </Pressable>
              <Pressable onPress={() => setShowGenerate(true)} style={[styles.iconBtn, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
                <Icon name="auto-fix" size={20} color={paperTheme.colors.onSurfaceVariant} />
              </Pressable>
              <Pressable onPress={() => setShowImport(true)} style={[styles.iconBtn, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
                <Icon name="file-upload" size={20} color={paperTheme.colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={brand.primary} />
              </View>
            ) : error ? (
              <View style={styles.centerState}>
                <ExpressiveEmptyState icon="alert-circle" title="Could not load cards" subtitle="Check your connection and try again." />
                <Button mode="contained" buttonColor={brand.primary} onPress={() => refetch()} style={{ borderRadius: SHAPE.lg }}>
                  Retry
                </Button>
              </View>
            ) : cards.length === 0 ? (
              <View style={styles.centerState}>
                <ExpressiveEmptyState icon="cards-outline" title="No cards yet" subtitle='Tap + to add one or use AI to generate.' />
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 8 }} showsVerticalScrollIndicator={true}>
                {cards.map((c: any, i: number) => (
                  <Animated.View key={c.id} entering={FadeInDown.duration(300).delay(i * 60).springify()}>
                    <Card mode="elevated" style={styles.cardItem}>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <View style={{ flex: 1, gap: 8 }}>
                          <View>
                            <Text variant="labelSmall" style={{ color: "#6366f1", fontWeight: "700", letterSpacing: 1, marginBottom: 2, fontSize: 10 }}>
                              TERM
                            </Text>
                            <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface, lineHeight: 22 }}>
                              {c.front}
                            </Text>
                          </View>
                          <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paperTheme.colors.outlineVariant, paddingTop: 8 }}>
                            <Text variant="labelSmall" style={{ color: "#10b981", fontWeight: "700", letterSpacing: 1, marginBottom: 2, fontSize: 10 }}>
                              DEFINITION
                            </Text>
                            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, lineHeight: 20 }}>
                              {c.back}
                            </Text>
                          </View>
                        </View>
                        <View style={{ gap: 8, alignSelf: "center" }}>
                          <Pressable onPress={() => handleEdit(c)} hitSlop={8}>
                            <Icon name="pencil" size={16} color={paperTheme.colors.onSurfaceVariant} />
                          </Pressable>
                          <Pressable onPress={() => handleDelete(c.id)} hitSlop={8}>
                            <Icon name="close" size={18} color={paperTheme.colors.onSurfaceVariant} />
                          </Pressable>
                        </View>
                      </View>
                    </Card>
                  </Animated.View>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.learnContent} showsVerticalScrollIndicator={true}>
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
              <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
                <ExpressiveEmptyState icon="cards-outline" title="No cards" subtitle="Add cards to this set first." />
              </View>
            ) : (
              <View style={styles.learnSession}>
                <ProgressBar
                  progress={(learnIdx + 1) / learnCards.length}
                  color={brand.primary}
                  style={[styles.progress, { backgroundColor: paperTheme.colors.surfaceVariant }]}
                />
                <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}>
                  {learnIdx + 1} / {learnCards.length}
                </Text>

                <FlipCard
                  key={`learn-${learnIdx}`}
                  front={learnCards[learnIdx]?.front ?? ""}
                  back={learnCards[learnIdx]?.back ?? ""}
                  flipped={learnFlipped}
                  onFlip={() => setLearnFlipped(!learnFlipped)}
                  cardKey={`learn-${learnIdx}`}
                />

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
              </View>
            )}
          </ScrollView>
        )}
      </View>

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

        <Modal visible={showEdit !== null} onDismiss={() => setShowEdit(null)} contentContainerStyle={[styles.modal, { backgroundColor: c.surface ?? paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Edit card</Text>
          <TextInput mode="outlined" label="Front" value={editFront} onChangeText={setEditFront} style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Back" value={editBack} onChangeText={setEditBack} multiline style={{ marginBottom: 16 }} />
          <Button mode="contained" buttonColor={brand.primary} onPress={handleSaveEdit} disabled={!editFront.trim() || !editBack.trim()}>Save</Button>
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
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingBottom: 8, alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: SHAPE.md, alignItems: "center", justifyContent: "center" },
  cardItem: { borderRadius: SHAPE.lg, paddingVertical: 14, paddingHorizontal: 14 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 16 },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },
  progress: { height: 6, borderRadius: SHAPE.xs },
  learnContent: { flexGrow: 1, padding: 20, justifyContent: "center" },
  learnSession: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  learnBtns: { flexDirection: "row", gap: 8, marginTop: 16 },
  flipPressable: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  flipFrame: { position: "relative" },
  flipCard: { borderRadius: SHAPE.xl, width: "100%", height: "100%", justifyContent: "center", borderWidth: 2, borderColor: "#6366f144" },
  flipCardContent: { paddingVertical: 32, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", height: "100%" },
});

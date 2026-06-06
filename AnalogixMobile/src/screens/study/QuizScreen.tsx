import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Card, IconButton, FAB, Portal, Modal, Button, TextInput } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { QUIZZES } from "../../graphql/queries/quiz";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

export default function QuizScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const [showGenerate, setShowGenerate] = useState(false);
  const { data, loading } = useQuery(QUIZZES);
  const quizzes = data?.quizzes ?? [];

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Quizzes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {quizzes.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="help-circle" size={64} color={paperTheme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 16, textAlign: "center" }}>
              No quizzes yet. Tap + to generate one.
            </Text>
          </View>
        ) : (
          quizzes.map((q: any) => (
            <Card key={q.id} mode="outlined" style={styles.quizCard} onPress={() => navigation.navigate("QuizSession", { quizId: q.id })}>
              <Card.Content style={styles.quizRow}>
                <View style={[styles.iconWrap, { backgroundColor: brand.primary + "18" }]}>
                  <Icon name="help-circle" size={22} color={brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{q.name ?? q.subject}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{q.questionCount ?? 0} questions</Text>
                </View>
                <Text variant="labelLarge" style={{ color: brand.primary, fontWeight: "700" }}>
                  {q.score ?? "-"}%
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB icon="plus" label="Generate" color="#fff" style={[styles.fab, { backgroundColor: brand.primary }]} onPress={() => setShowGenerate(true)} />

      <Portal>
        <Modal visible={showGenerate} onDismiss={() => setShowGenerate(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 16 }}>
            Generate quiz
          </Text>
          <TextInput mode="outlined" label="Subject" placeholder="e.g. Biology" style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Topic" placeholder="e.g. Cell division" style={{ marginBottom: 16 }} />
          <Button mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg }} onPress={() => { setShowGenerate(false); }}>
            Generate
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 120, gap: 8 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  quizCard: { borderRadius: SHAPE.lg },
  quizRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: SHAPE.md, alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: 16, bottom: 100, borderRadius: SHAPE.lg },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },
});

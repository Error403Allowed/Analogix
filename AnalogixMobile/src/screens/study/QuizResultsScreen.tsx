import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, Card, Button, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";

export default function QuizResultsScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { quizId } = route.params;

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
        <IconButton icon="close" onPress={() => navigation.goBack()} accessibilityLabel="Close results" />
        <Text variant="titleMedium" style={{ fontWeight: "700", flex: 1 }}>Results</Text>
      </View>

      <View style={[styles.center, { paddingBottom: insets.bottom + 24 }]}>
        <Card mode="elevated" style={styles.scoreCard}>
          <Card.Content style={{ alignItems: "center" }}>
            <Text variant="displaySmall" style={{ fontWeight: "700", color: brand.primary }}>--%</Text>
            <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurface, marginTop: 4 }}>
              Quiz complete
            </Text>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={styles.feedbackCard}>
          <Card.Content>
            <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>AI Feedback</Text>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 8 }}>
              Great effort! Review your answers to strengthen your knowledge.
            </Text>
          </Card.Content>
        </Card>

        <Button mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg, marginTop: 16 }} contentStyle={{ height: 48 }} onPress={() => navigation.goBack()}>
          Done
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  center: { flex: 1, padding: 20, justifyContent: "center", gap: 16 },
  scoreCard: { borderRadius: SHAPE.xl, padding: 16 },
  feedbackCard: { borderRadius: SHAPE.lg },
});

import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import {
  ExpressiveScreen,
  ExpressiveSection,
  PressableScale,
} from "../../components/expressive";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

interface StudyTool {
  key: string;
  name: string;
  icon: string;
  description: string;
  screen: string;
  color: string;
}

const TOOLS: StudyTool[] = [
  { key: "flashcards", name: "Flashcards", icon: "cards", description: "Study with spaced-repetition cards", screen: "Flashcards", color: "#8b5cf6" },
  { key: "quiz", name: "Quiz", icon: "help-circle", description: "AI-generated practice quizzes", screen: "Quiz", color: "#3b82f6" },
  { key: "calendar", name: "Calendar", icon: "calendar", description: "Upcoming events and deadlines", screen: "Calendar", color: "#f59e0b" },
  { key: "formulas", name: "Formulas", icon: "function", description: "Formula sheets and references", screen: "Formulas", color: "#10b981" },
  { key: "timer", name: "Timer", icon: "timer", description: "Focus and break time tracking", screen: "Timer", color: "#ef4444" },
];

export default function StudyHubScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();

  return (
    <ExpressiveScreen 
    title="Study"
    subtitle="Everything you need, in one place"
    leadingIcon="book-open-variant">
      <ExpressiveSection title="Tools">
        <View style={{ gap: 8 }}>
          {TOOLS.map((tool) => (
            <PressableScale
              key={tool.key}
              onPress={() => navigation.navigate(tool.screen)}
            >
              <View style={[styles.toolCard, { backgroundColor: paperTheme.colors.surface, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }]}>
                <View style={[styles.iconBox, { backgroundColor: tool.color + "16" }]}>
                  <Icon name={tool.icon} size={22} color={tool.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>{tool.name}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{tool.description}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={paperTheme.colors.onSurfaceVariant} />
              </View>
            </PressableScale>
          ))}
        </View>
      </ExpressiveSection>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  toolCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: SHAPE.lg,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

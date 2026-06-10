import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Modal, Animated, Dimensions, Pressable } from "react-native";
import { Text, useTheme, Button } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeContext } from "../theme/ThemeContext";
import Icon from "./Icon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TUTORIAL_KEY = "analogix_tutorial_completed";

interface Step {
  icon: string;
  title: string;
  content: string;
}

const STEPS: Step[] = [
  { icon: "hand-wave", title: "Welcome to Analogix!", content: "Your AI-powered study companion. Let's take a quick tour to get you started." },
  { icon: "view-dashboard", title: "Dashboard", content: "Your home base. View your study stats, quick links, upcoming events, and recent documents at a glance." },
  { icon: "forum", title: "AI Tutor", content: "Chat with your AI tutor. Ask questions, get explanations, and generate flashcards and quizzes from any conversation." },
  { icon: "book-open-variant", title: "Study Resources", content: "Access past papers and textbooks organized by subject. Filter and search across all your resources." },
  { icon: "cards", title: "Flashcards", content: "Create flashcard sets, review with spaced repetition, and generate cards from your study materials using AI." },
  { icon: "clipboard-text", title: "Quizzes", content: "Test your knowledge with AI-generated quizzes. Choose difficulty, question type, and timed mode." },
  { icon: "calendar", title: "Calendar", content: "Track events and deadlines across month, week, day, and schedule views. Import your school calendar via ICS." },
  { icon: "timer", title: "Timer", content: "Stay focused with the Pomodoro timer. Customize study and break durations, track sessions, and build your streak." },
  { icon: "school", title: "Subjects", content: "Manage your subjects, view the syllabus, track marks, add homework, and create documents." },
  { icon: "sigma", title: "Formulas", content: "Browse formula sheets by subject. Search across all subjects and view LaTeX-rendered formulas." },
  { icon: "account-group", title: "Study Rooms", content: "Collaborate with peers in real-time study rooms. Chat, share documents, and use a shared timer." },
  { icon: "trophy", title: "Achievements", content: "Unlock achievements as you study. Track your XP, level up, and maintain your streak." },
  { icon: "check-circle", title: "You're all set!", content: "Start exploring! Tap any feature or ask your AI tutor for help. Happy studying!" },
];

export default function TutorialOverlay() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, []);

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      complete();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const complete = () => {
    AsyncStorage.setItem(TUTORIAL_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={complete}>
      <Pressable style={styles.backdrop} onPress={complete}>
        <Pressable onPress={() => {}}>
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: paperTheme.colors.surface,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                paddingTop: insets.top + 20,
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View style={[styles.progressBarBg, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: brand.primary }]} />
            </View>

            <View style={styles.content}>
              <View style={[styles.iconWrap, { backgroundColor: brand.primary + "18" }]}>
                <Icon name={s.icon} size={32} color={brand.primary} />
              </View>
              <Text variant="headlineSmall" style={{ fontWeight: "900", color: paperTheme.colors.onSurface, marginTop: 16, marginBottom: 8 }}>
                {s.title}
              </Text>
              <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, lineHeight: 24 }}>
                {s.content}
              </Text>
            </View>

            <View style={[styles.footer, { borderTopColor: paperTheme.colors.outlineVariant }]}>
              <Button
                mode="text"
                onPress={prev}
                disabled={isFirst}
                textColor={paperTheme.colors.onSurfaceVariant}
                style={{ opacity: isFirst ? 0.4 : 1 }}
              >
                Back
              </Button>
              <View style={styles.dots}>
                {STEPS.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: idx === step ? brand.primary : idx < step ? brand.primary + "60" : paperTheme.colors.outlineVariant,
                        width: idx === step ? 24 : 8,
                      },
                    ]}
                  />
                ))}
              </View>
              <Button mode="contained" buttonColor={brand.primary} style={{ borderRadius: 20 }} onPress={next}>
                {isLast ? "Start learning" : "Next"}
              </Button>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    maxHeight: "85%",
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  content: {
    alignItems: "center",
    paddingVertical: 24,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 16,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

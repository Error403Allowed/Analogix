import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, Dimensions } from "react-native";
import { Text, useTheme, Button, ProgressBar, Card, TextInput as PaperInput } from "react-native-paper";
import { gql } from "@apollo/client";
import { useMutation, useQuery, useApolloClient } from "@apollo/client/react";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import ConfettiCannon from "react-native-confetti-cannon";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  FadeInDown,
  FadeOutUp,
} from "react-native-reanimated";
import { useAuth } from "../../context/AuthContext";
import { ME, UPDATE_PROFILE } from "../../graphql/queries/user";
import { IMPORT_ICS } from "../../graphql/queries/calendar";
import { AUSTRALIAN_STATES, GRADES, type AustralianState, type Grade } from "@analogix/shared/curriculum";
import InterestPicker from "../../components/InterestPicker";
import { buildHobbyDetails } from "../../utils/interests";
import { SHAPE } from "../../theme/tokens";
import { MOTION } from "../../theme/tokens";
import Icon from "../../components/Icon";
import { SUBJECT_CATALOG } from "../../data/subjects";

const SUBJECTS = SUBJECT_CATALOG.map((s) => s.label);

type StepKey = "name" | "grade" | "state" | "subjects" | "interests" | "ics" | "done";
const STEPS: StepKey[] = ["name", "grade", "state", "subjects", "interests", "ics", "done"];

const STEP_HEADINGS: Record<StepKey, string> = {
  name: "What should we call you?",
  grade: "What grade are you in?",
  state: "Which state are you in?",
  subjects: "Your subjects",
  interests: "Pick your interests",
  ics: "Import your calendar",
  done: "You're all set!",
};

function useTypewriter(text: string, speed = 40): string {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

function Chip({ label, selected, emoji, onPress }: { label: string; selected: boolean; emoji?: string; onPress: () => void }) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(0.92, MOTION.tap),
      withSpring(1, { ...MOTION.tap, stiffness: 200 }),
    );
    onPress();
  }, [onPress, scale]);

  const chipAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={chipAnim}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceVariant,
            borderRadius: SHAPE.pill,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          },
        ]}
      >
        {emoji ? <Icon name={emoji} size={16} color={selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} /> : null}
        <Text style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurface, fontWeight: "700" }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const paperTheme = useTheme();
  const { user } = useAuth();
  const { data: meData } = useQuery(ME, { fetchPolicy: "cache-only" });
  const [stepIdx, setStepIdx] = useState(0);
  const [name, setName] = useState(meData?.me?.name ?? user?.email?.split("@")[0] ?? "");
  const [grade, setGrade] = useState<Grade | null>((meData?.me?.grade as Grade) ?? null);
  const [state, setState] = useState<AustralianState | null>((meData?.me?.state as AustralianState) ?? null);
  const [subjects, setSubjects] = useState<string[]>(meData?.me?.subjects ?? []);
  const [hobbyIds, setHobbyIds] = useState<string[]>([]);
  const [subtopics, setSubtopics] = useState<Record<string, string[]>>({});
  const [icsFile, setIcsFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [confettiFired, setConfettiFired] = useState(false);
  const confettiRef = useRef<any>(null);
  const [stepKey, setStepKey] = useState(0);

  const apolloClient = useApolloClient();
  const [updateProfile] = useMutation(UPDATE_PROFILE);
  const [importIcs] = useMutation(IMPORT_ICS);

  const totalSteps = STEPS.length;
  const currentStep = STEPS[stepIdx];
  const headingText = useTypewriter(STEP_HEADINGS[currentStep], 35);

  const canProceed = () => {
    if (currentStep === "name") return name.trim().length > 0;
    if (currentStep === "grade") return Boolean(grade);
    if (currentStep === "state") return Boolean(state);
    if (currentStep === "subjects") return subjects.length > 0;
    return true;
  };

  const next = async () => {
    if (stepIdx < totalSteps - 1) {
      setStepKey((k) => k + 1);
      setStepIdx(stepIdx + 1);
    } else {
      setSaving(true);
      const hobbyData = buildHobbyDetails(hobbyIds, subtopics);
      try {
        if (icsFile && !icsFile.canceled && icsFile.assets?.[0]?.uri) {
          const icsContent = await readAsStringAsync(icsFile.assets[0].uri);
          await importIcs({ variables: { ics: icsContent } });
        }
        await updateProfile({
          variables: {
            input: {
              name: name.trim(), grade, state, subjects,
              hobbies: hobbyData.hobbies,
              hobby_ids: hobbyData.hobbyIds,
              hobby_details: hobbyData.hobbyDetails,
              onboardingComplete: true,
            },
          },
        });
        if (!confettiFired) {
          setConfettiFired(true);
          setTimeout(() => confettiRef.current?.start(), 200);
        }
      } catch (e) {
        // Mutation may fail (e.g. 401 from server), still proceed
      } finally {
        setSaving(false);
      }
      // Optimistically mark onboarding as complete so AuthGate
      // transitions to the main tabs even if the server returned 401.
      apolloClient.cache.writeFragment({
        id: `Profile:${user?.id}`,
        fragment: gql`
          fragment _onboarded on Profile {
            onboardingComplete
          }
        `,
        data: { onboardingComplete: true },
      });
    }
  };

  const toggleSubject = (s: string) => {
    setSubjects((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  };

  const toggleHobby = (id: string) => {
    setHobbyIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    setSubtopics((p) => {
      if (p[id]) { const next = { ...p }; delete next[id]; return next; }
      return p;
    });
  };

  const toggleSubtopic = (hobbyId: string, sub: string) => {
    setSubtopics((p) => {
      const curr = p[hobbyId] ?? [];
      const next = curr.includes(sub) ? curr.filter((s) => s !== sub) : [...curr, sub];
      return { ...p, [hobbyId]: next };
    });
  };

  const addCustomSubtopic = (hobbyId: string, value: string) => {
    setSubtopics((p) => {
      const curr = p[hobbyId] ?? [];
      if (curr.some((s) => s.toLowerCase() === value.toLowerCase())) return p;
      return { ...p, [hobbyId]: [...curr, value] };
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.progressBar}>
        <ProgressBar progress={(stepIdx + 1) / totalSteps} color={paperTheme.colors.primary} style={styles.progress} />
        <Text variant="labelSmall" style={[styles.stepLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Step {stepIdx + 1} of {totalSteps}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View key={stepKey} entering={FadeInDown.duration(300).springify().damping(26).stiffness(240)}>
          {currentStep === "name" && (
            <View>
              <Text variant="headlineMedium" style={styles.heading}>{headingText}</Text>
              <PaperInput
                mode="outlined"
                label="Your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                outlineStyle={{ borderRadius: SHAPE.lg }}
              />
            </View>
          )}

          {currentStep === "grade" && (
            <View>
              <Text variant="headlineMedium" style={styles.heading}>{headingText}</Text>
              <View style={styles.chips}>
                {GRADES.map((g) => (
                  <Chip key={g} label={`Year ${g}`} selected={grade === g} onPress={() => setGrade(g)} />
                ))}
              </View>
            </View>
          )}

          {currentStep === "state" && (
            <View>
              <Text variant="headlineMedium" style={styles.heading}>{headingText}</Text>
              <View style={styles.chips}>
                {AUSTRALIAN_STATES.map((s) => (
                  <Chip key={s} label={s} selected={state === s} onPress={() => setState(s)} />
                ))}
              </View>
            </View>
          )}

          {currentStep === "subjects" && (
            <View>
              <Text variant="headlineMedium" style={styles.heading}>{headingText}</Text>
              <Text variant="bodyLarge" style={styles.subheading}>Pick the subjects you're studying this year.</Text>
              <View style={styles.chips}>
                {SUBJECT_CATALOG.map((s) => {
                  const selected = subjects.includes(s.label);
                  return (
                    <Chip
                      key={s.id}
                      label={s.label}
                      selected={selected}
                      emoji={s.icon}
                      onPress={() => toggleSubject(s.label)}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {currentStep === "interests" && (
            <View>
              <Text variant="headlineMedium" style={styles.heading}>{headingText}</Text>
              <InterestPicker
                selectedIds={hobbyIds}
                subtopics={subtopics}
                onToggleHobby={toggleHobby}
                onToggleSubtopic={toggleSubtopic}
                onAddCustom={addCustomSubtopic}
              />
            </View>
          )}

          {currentStep === "ics" && (
            <View>
              <Text variant="headlineMedium" style={styles.heading}>{headingText}</Text>
              <Text variant="bodyLarge" style={styles.subheading}>
                Import your school timetable or assessment dates from an ICS file. You can always do this later.
              </Text>
              <View style={styles.icsActions}>
                <Button
                  mode="outlined"
                  icon="calendar-import"
                  onPress={async () => {
                    const result = await DocumentPicker.getDocumentAsync({ type: "text/calendar", copyToCacheDirectory: true });
                    if (!result.canceled) setIcsFile(result);
                  }}
                  style={{ borderRadius: SHAPE.lg }}
                >
                  {icsFile && !icsFile.canceled
                    ? (icsFile as any).assets?.[0]?.name ?? "Change file"
                    : "Pick an ICS file"}
                </Button>
                {icsFile && !icsFile.canceled && (
                  <Card mode="outlined" style={styles.icsPreview}>
                    <Card.Content style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: "600" }}>File selected</Text>
                        <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                          {(icsFile as any).assets?.[0]?.name ?? "calendar.ics"}
                        </Text>
                      </View>
                      <Button compact textColor={paperTheme.colors.error} onPress={() => setIcsFile(null)}>Remove</Button>
                    </Card.Content>
                  </Card>
                )}
              </View>
            </View>
          )}

          {currentStep === "done" && (
            <View style={styles.doneContainer}>
              <View style={[styles.doneIcon, { backgroundColor: paperTheme.colors.primary }]}>
                <Text style={{ color: paperTheme.colors.onPrimary, fontWeight: "900", fontSize: 40 }}>✓</Text>
              </View>
              <Text variant="headlineMedium" style={[styles.heading, { textAlign: "center" }]}>{headingText}</Text>
              <Text variant="bodyLarge" style={[styles.subheading, { textAlign: "center" }]}>
                Your AI tutor is ready to help you learn, {name.split(" ")[0]}. Let's go!
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {currentStep === "done" && (
        <ConfettiCannon
          ref={confettiRef}
          count={120}
          origin={{ x: Dimensions.get("window").width / 2, y: 0 }}
          fadeOut
          autoStart={false}
        />
      )}

      <View style={styles.footer}>
        <Button mode="text" onPress={() => { setStepKey((k) => k + 1); setStepIdx(Math.max(0, stepIdx - 1)); }} disabled={stepIdx === 0}>
          Back
        </Button>
        <Button
          mode="contained"
          buttonColor={paperTheme.colors.primary}
          onPress={next}
          loading={saving}
          disabled={!canProceed()}
          contentStyle={{ height: 48 }}
          style={{ borderRadius: SHAPE.pill, minWidth: 120 }}
        >
          {currentStep === "done" ? "Finish" : "Next"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBar: { paddingTop: 60, paddingHorizontal: 24 },
  progress: { height: 6, borderRadius: SHAPE.xs },
  stepLabel: { marginTop: 6, textAlign: "right" },
  content: { padding: 24, paddingBottom: 80 },
  heading: { fontWeight: "700", marginBottom: 16 },
  subheading: { marginBottom: 24, opacity: 0.7 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 18, paddingVertical: 12, minHeight: 48 },
  icsActions: { gap: 12 },
  icsPreview: { borderRadius: SHAPE.lg },
  doneContainer: { alignItems: "center", paddingTop: 40 },
  doneIcon: { width: 88, height: 88, borderRadius: SHAPE.xl, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  footer: { flexDirection: "row", justifyContent: "space-between", padding: 16, paddingBottom: 32, gap: 8 },
});

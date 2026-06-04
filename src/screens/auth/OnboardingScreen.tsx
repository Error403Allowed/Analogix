import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
import { Button, Text, TextInput, useTheme, Chip, ProgressBar } from "react-native-paper";
import { useMutation, useQuery } from "@apollo/client";
import * as DocumentPicker from "expo-document-picker";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useAuth } from "../../context/AuthContext";
import { ME, UPDATE_PROFILE } from "../../graphql/queries/user";
import { AUSTRALIAN_STATES, GRADES, type AustralianState, type Grade } from "../../shared/curriculum";
import InterestPicker from "../../components/InterestPicker";
import { buildHobbyDetails } from "../../utils/interests";
import { SHAPE } from "../../theme/tokens";
import { useThemeContext } from "../../theme/ThemeContext";
import Icon from "../../components/Icon";

const SUBJECTS = ["Mathematics", "English", "Biology", "Chemistry", "Physics", "History", "Geography", "Economics", "Software Engineering", "Visual Art", "Music", "PDHPE"];

type StepKey = "name" | "grade" | "state" | "subjects" | "interests" | "ics" | "done";

const STEPS: StepKey[] = ["name", "grade", "state", "subjects", "interests", "ics", "done"];

export default function OnboardingScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
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

  const [updateProfile] = useMutation(UPDATE_PROFILE);

  const totalSteps = STEPS.length;

  const canProceed = (): boolean => {
    const step = STEPS[stepIdx];
    if (step === "name") return name.trim().length > 0;
    if (step === "grade") return Boolean(grade);
    if (step === "state") return Boolean(state);
    if (step === "subjects") return subjects.length > 0;
    if (step === "interests") return true;
    if (step === "ics") return true;
    if (step === "done") return true;
    return false;
  };

  const next = async () => {
    if (stepIdx < totalSteps - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      setSaving(true);
      const hobbyData = buildHobbyDetails(hobbyIds, subtopics);
      try {
        await updateProfile({
          variables: {
            input: {
              name: name.trim(),
              grade,
              state,
              subjects,
              hobbies: hobbyData.hobbies,
              hobby_ids: hobbyData.hobbyIds,
              hobby_details: hobbyData.hobbyDetails,
              onboardingComplete: true,
            },
          },
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const toggleSubject = (s: string) => {
    setSubjects((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  };

  const toggleHobby = (id: string) => {
    setHobbyIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    setSubtopics((p) => {
      if (p[id]) {
        const next = { ...p };
        delete next[id];
        return next;
      }
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

  const pickIcs = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/calendar",
        copyToCacheDirectory: true,
      });
      if (!result.canceled) setIcsFile(result);
    } catch {
      // user cancelled
    }
  };

  const currentStep = STEPS[stepIdx];

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.progressBar}>
        <ProgressBar
          progress={(stepIdx + 1) / totalSteps}
          color={brand.primary}
          style={styles.progress}
        />
        <Text variant="labelSmall" style={[styles.stepLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
          Step {stepIdx + 1} of {totalSteps}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {currentStep === "name" && (
          <Animated.View entering={FadeIn} exiting={FadeOut} key="name">
            <Text variant="headlineLarge" style={styles.heading}>What should we call you?</Text>
            <TextInput
              label="Your name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              autoCapitalize="words"
            />
          </Animated.View>
        )}

        {currentStep === "grade" && (
          <Animated.View entering={FadeIn} exiting={FadeOut} key="grade">
            <Text variant="headlineLarge" style={styles.heading}>What grade are you in?</Text>
            <View style={styles.chips}>
              {GRADES.map((g) => (
                <Chip
                  key={g}
                  selected={grade === g}
                  onPress={() => setGrade(g)}
                  style={[styles.chip, { borderRadius: SHAPE.lg }]}
                  mode="outlined"
                >
                  Year {g}
                </Chip>
              ))}
            </View>
          </Animated.View>
        )}

        {currentStep === "state" && (
          <Animated.View entering={FadeIn} exiting={FadeOut} key="state">
            <Text variant="headlineLarge" style={styles.heading}>Which state are you in?</Text>
            <View style={styles.chips}>
              {AUSTRALIAN_STATES.map((s) => (
                <Chip
                  key={s}
                  selected={state === s}
                  onPress={() => setState(s)}
                  style={[styles.chip, { borderRadius: SHAPE.lg }]}
                  mode="outlined"
                >
                  {s}
                </Chip>
              ))}
            </View>
          </Animated.View>
        )}

        {currentStep === "subjects" && (
          <Animated.View entering={FadeIn} exiting={FadeOut} key="subjects">
            <Text variant="headlineLarge" style={styles.heading}>Your subjects</Text>
            <Text variant="bodyLarge" style={styles.subheading}>
              Pick the subjects you're studying this year.
            </Text>
            <View style={styles.chips}>
              {SUBJECTS.map((s) => (
                <Chip
                  key={s}
                  selected={subjects.includes(s)}
                  onPress={() => toggleSubject(s)}
                  style={[styles.chip, { borderRadius: SHAPE.lg }]}
                  mode="outlined"
                >
                  {s}
                </Chip>
              ))}
            </View>
          </Animated.View>
        )}

        {currentStep === "interests" && (
          <Animated.View entering={FadeIn} exiting={FadeOut} key="interests">
            <InterestPicker
              selectedIds={hobbyIds}
              subtopics={subtopics}
              onToggleHobby={toggleHobby}
              onToggleSubtopic={toggleSubtopic}
              onAddCustom={addCustomSubtopic}
            />
          </Animated.View>
        )}

        {currentStep === "ics" && (
          <Animated.View entering={FadeIn} exiting={FadeOut} key="ics">
            <Text variant="headlineLarge" style={styles.heading}>Import your calendar</Text>
            <Text variant="bodyLarge" style={styles.subheading}>
              Import your school timetable, assessment dates, or extracurricular schedule from an ICS file.
              You can always do this later from the calendar.
            </Text>
            <View style={styles.icsActions}>
              <Button
                mode="outlined"
                icon="calendar-import"
                onPress={pickIcs}
                style={[styles.icsButton, { borderRadius: SHAPE.xl }]}
              >
                {icsFile && !icsFile.canceled
                  ? (icsFile as DocumentPicker.DocumentPickerSuccessResult).assets?.[0]?.name ?? "Change file"
                  : "Pick an ICS file"}
              </Button>
              {icsFile && !icsFile.canceled && (
                <View style={[styles.icsPreview, { backgroundColor: paperTheme.colors.surfaceVariant, borderRadius: SHAPE.lg }]}>
                  <Icon name="file-document-outline" size={24} color={paperTheme.colors.primary} />
                  <Text variant="bodyMedium" style={{ flex: 1 }}>
                    {(icsFile as DocumentPicker.DocumentPickerSuccessResult).assets?.[0]?.name ?? "File selected"}
                  </Text>
                  <Button compact mode="text" onPress={() => setIcsFile(null)}>Remove</Button>
                </View>
              )}
              {!icsFile && (
                <Button
                  mode="text"
                  icon="close"
                  onPress={() => {}}
                  style={{ marginTop: 8 }}
                >
                  Skip for now
                </Button>
              )}
            </View>
          </Animated.View>
        )}

        {currentStep === "done" && (
          <Animated.View entering={FadeIn} exiting={FadeOut} key="done" style={styles.doneContainer}>
            <View style={[styles.doneIcon, { backgroundColor: brand.primary }]}>
              <Icon name="check" size={48} color="#fff" />
            </View>
            <Text variant="headlineLarge" style={[styles.heading, { textAlign: "center" }]}>
              You're all set!
            </Text>
            <Text variant="bodyLarge" style={[styles.subheading, { textAlign: "center" }]}>
              Your AI tutor is ready to help you learn, {name.split(" ")[0]}. Let's go!
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="text"
          onPress={() => setStepIdx(Math.max(0, stepIdx - 1))}
          disabled={stepIdx === 0}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={next}
          loading={saving}
          disabled={!canProceed()}
          contentStyle={{ height: 52 }}
          style={{ borderRadius: SHAPE.xl, backgroundColor: brand.primary, minWidth: 120 }}
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
  progress: { height: 6, borderRadius: 3 },
  stepLabel: { marginTop: 6, textAlign: "right" },
  content: { padding: 24, paddingBottom: 80 },
  heading: { fontWeight: "800", marginBottom: 12 },
  subheading: { marginBottom: 24, opacity: 0.7 },
  input: { marginBottom: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { marginBottom: 4 },
  icsActions: { gap: 12 },
  icsButton: { marginTop: 8 },
  icsPreview: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  doneContainer: { alignItems: "center", paddingTop: 40 },
  doneIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  footer: { flexDirection: "row", justifyContent: "space-between", padding: 16, paddingBottom: 32, gap: 8 },
});

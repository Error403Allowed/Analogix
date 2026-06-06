import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import { Text, useTheme, Button, ProgressBar, Card, TextInput as PaperInput } from "react-native-paper";
import { useMutation, useQuery } from "@apollo/client";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "../../context/AuthContext";
import { ME, UPDATE_PROFILE } from "../../graphql/queries/user";
import { AUSTRALIAN_STATES, GRADES, type AustralianState, type Grade } from "../../shared/curriculum";
import InterestPicker from "../../components/InterestPicker";
import { buildHobbyDetails } from "../../utils/interests";
import { SHAPE } from "../../theme/tokens";

const SUBJECTS = ["Mathematics", "English", "Biology", "Chemistry", "Physics", "History", "Geography", "Economics", "Software Engineering", "Visual Art", "Music", "PDHPE"];

type StepKey = "name" | "grade" | "state" | "subjects" | "interests" | "ics" | "done";
const STEPS: StepKey[] = ["name", "grade", "state", "subjects", "interests", "ics", "done"];

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

  const [updateProfile] = useMutation(UPDATE_PROFILE);

  const totalSteps = STEPS.length;
  const currentStep = STEPS[stepIdx];

  const canProceed = () => {
    if (currentStep === "name") return name.trim().length > 0;
    if (currentStep === "grade") return Boolean(grade);
    if (currentStep === "state") return Boolean(state);
    if (currentStep === "subjects") return subjects.length > 0;
    return true;
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
              name: name.trim(), grade, state, subjects,
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
        {currentStep === "name" && (
          <View key="name">
            <Text variant="headlineMedium" style={styles.heading}>What should we call you?</Text>
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
          <View key="grade">
            <Text variant="headlineMedium" style={styles.heading}>What grade are you in?</Text>
            <View style={styles.chips}>
              {GRADES.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGrade(g)}
                  style={[styles.chip, { backgroundColor: grade === g ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.pill }]}
                >
                  <Text style={{ color: grade === g ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface, fontWeight: "700" }}>Year {g}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {currentStep === "state" && (
          <View key="state">
            <Text variant="headlineMedium" style={styles.heading}>Which state are you in?</Text>
            <View style={styles.chips}>
              {AUSTRALIAN_STATES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setState(s)}
                  style={[styles.chip, { backgroundColor: state === s ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.pill }]}
                >
                  <Text style={{ color: state === s ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface, fontWeight: "700" }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {currentStep === "subjects" && (
          <View key="subjects">
            <Text variant="headlineMedium" style={styles.heading}>Your subjects</Text>
            <Text variant="bodyLarge" style={styles.subheading}>Pick the subjects you're studying this year.</Text>
            <View style={styles.chips}>
              {SUBJECTS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => toggleSubject(s)}
                  style={[styles.chip, { backgroundColor: subjects.includes(s) ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.pill }]}
                >
                  <Text style={{ color: subjects.includes(s) ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface, fontWeight: "700" }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {currentStep === "interests" && (
          <View key="interests">
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
          <View key="ics">
            <Text variant="headlineMedium" style={styles.heading}>Import your calendar</Text>
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
                    <Text variant="bodyMedium" style={{ flex: 1 }}>File selected</Text>
                    <Button compact textColor={paperTheme.colors.error} onPress={() => setIcsFile(null)}>Remove</Button>
                  </Card.Content>
                </Card>
              )}
            </View>
          </View>
        )}

        {currentStep === "done" && (
          <View key="done" style={styles.doneContainer}>
            <View style={[styles.doneIcon, { backgroundColor: paperTheme.colors.primary }]}>
              <Text style={{ color: paperTheme.colors.onPrimary, fontWeight: "900", fontSize: 40 }}>{'\u2713'}</Text>
            </View>
            <Text variant="headlineMedium" style={[styles.heading, { textAlign: "center" }]}>You're all set!</Text>
            <Text variant="bodyLarge" style={[styles.subheading, { textAlign: "center" }]}>
              Your AI tutor is ready to help you learn, {name.split(" ")[0]}. Let's go!
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button mode="text" onPress={() => setStepIdx(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0}>
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
  chip: { paddingHorizontal: 18, paddingVertical: 12 },
  icsActions: { gap: 12 },
  icsPreview: { borderRadius: SHAPE.lg },
  doneContainer: { alignItems: "center", paddingTop: 40 },
  doneIcon: { width: 88, height: 88, borderRadius: SHAPE.xl, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  footer: { flexDirection: "row", justifyContent: "space-between", padding: 16, paddingBottom: 32, gap: 8 },
});

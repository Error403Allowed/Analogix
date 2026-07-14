import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, ActivityIndicator, Button, SegmentedButtons } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigation } from "@react-navigation/native";
import { GENERATE_STUDY_SCHEDULE } from "../../graphql/queries/ai";
import { EVENTS } from "../../graphql/queries/calendar";
import { ME } from "../../graphql/queries/user";
import Icon from "../../components/Icon";
import { SHAPE } from "../../theme/tokens";
import { useThemeContext } from "../../theme/ThemeContext";

interface StudyDay {
  day: number;
  date: string;
  tasks: string[];
  durationMinutes: number;
}

interface StudySchedule {
  summary: string;
  days: StudyDay[];
}

export default function StudyScheduleScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const c = paperTheme.colors as any;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [duration, setDuration] = useState(14);
  const [schedule, setSchedule] = useState<StudySchedule | null>(null);

  const { data: userData } = useQuery(ME);
  const { data: eventsData } = useQuery(EVENTS, {
    variables: {
      from: new Date().toISOString(),
      to: new Date(Date.now() + 90 * 86400000).toISOString(),
    },
  });

  const [generateSchedule, { loading }] = useMutation(GENERATE_STUDY_SCHEDULE);

  const handleGenerate = useCallback(async () => {
    try {
      const events = (eventsData?.events ?? []).map((e: any) => ({
        title: e.title,
        date: e.date,
        type: e.type,
        subject: e.subject,
      }));
      const deadlines = (eventsData?.deadlines ?? []).map((d: any) => ({
        title: d.title,
        date: d.dueDate,
        type: "deadline",
        subject: d.subject,
      }));
      const allEvents = [...events, ...deadlines].slice(0, 8);

      const { data } = await generateSchedule({
        variables: {
          input: {
            days: duration,
            events: allEvents,
            grade: userData?.me?.grade,
            state: userData?.me?.state,
          },
        },
      });

      if (data?.generateStudySchedule) {
        setSchedule(data.generateStudySchedule);
      }
    } catch (err: any) {
      console.warn("[study-schedule] error", err);
    }
  }, [duration, eventsData, userData, generateSchedule]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.surface ?? paperTheme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.outlineVariant }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
        <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurface, fontWeight: "700", flex: 1 }}>
          Study Schedule
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {!schedule && (
          <View style={styles.setup}>
            <View style={styles.hero}>
              <Icon name="calendar-clock" size={48} color={brand.primary} />
              <Text variant="titleLarge" style={[styles.heroTitle, { color: paperTheme.colors.onSurface }]}>
                Generate a study plan
              </Text>
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}>
                Create a personalised study schedule based on your upcoming exams and assignments.
              </Text>
            </View>

            <Text variant="labelLarge" style={[styles.label, { color: paperTheme.colors.onSurface }]}>
              Plan duration
            </Text>
            <SegmentedButtons
              value={String(duration)}
              onValueChange={(v) => setDuration(Number(v))}
              buttons={[
                { value: "7", label: "7 days" },
                { value: "14", label: "14 days" },
                { value: "30", label: "30 days" },
              ]}
              style={{ marginBottom: 24 }}
            />

            <Button
              mode="contained"
              onPress={handleGenerate}
              loading={loading}
              disabled={loading}
              style={{ borderRadius: SHAPE.md }}
              contentStyle={{ height: 48 }}
            >
              {loading ? "Generating..." : "Generate Schedule"}
            </Button>

            {(eventsData?.events?.length === 0 && eventsData?.deadlines?.length === 0) && (
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 16 }}>
                No upcoming events found. Add exams or assignments in the Calendar to get a personalised schedule.
              </Text>
            )}
          </View>
        )}

        {schedule && (
          <>
            <View style={styles.summaryCard}>
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurface, lineHeight: 22 }}>
                {schedule.summary}
              </Text>
            </View>

            {schedule.days.map((day, i) => (
              <View key={i} style={[styles.dayCard, { backgroundColor: c.surfaceContainerLow ?? paperTheme.colors.surfaceVariant }]}>
                <View style={styles.dayHeader}>
                  <Icon name="calendar" size={16} color={brand.primary} />
                  <Text variant="labelLarge" style={{ color: paperTheme.colors.onSurface, fontWeight: "600" }}>
                    Day {day.day} — {formatDate(day.date)}
                  </Text>
                  <View style={styles.durationBadge}>
                    <Text variant="labelSmall" style={{ color: brand.primary }}>
                      {day.durationMinutes} min
                    </Text>
                  </View>
                </View>
                {day.tasks.map((task, j) => (
                  <View key={j} style={styles.taskRow}>
                    <Icon name="circle-small" size={16} color={brand.primary} />
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurface, flex: 1 }}>
                      {task}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            <Button
              mode="outlined"
              onPress={() => setSchedule(null)}
              style={{ marginTop: 16, borderRadius: SHAPE.md }}
            >
              Regenerate
            </Button>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 16,
    paddingBottom: 40,
  },
  setup: {
    gap: 16,
  },
  hero: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  heroTitle: {
    fontWeight: "700",
    textAlign: "center",
  },
  label: {
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryCard: {
    backgroundColor: "rgba(99,102,241,0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  dayCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  durationBadge: {
    marginLeft: "auto",
    backgroundColor: "rgba(99,102,241,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
    paddingLeft: 4,
  },
});

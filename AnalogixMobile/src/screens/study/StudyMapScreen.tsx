import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client/react";
import { useNavigation } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";
import { STUDY_MAP } from "../../graphql/queries/subject";
import {
  ExpressiveScreen,
  ExpressiveSection,
  ExpressiveEmptyState,
  PressableScale,
} from "../../components/expressive";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import { SUBJECT_CATALOG } from "../../data/subjects";

const SUBJECT_COLORS: Record<string, string> = {
  math: "#6366f1",
  english: "#ec4899",
  science: "#22c55e",
  physics: "#3b82f6",
  chemistry: "#10b981",
  biology: "#84cc16",
  history: "#a855f7",
  geography: "#14b8a6",
  computing: "#f59e0b",
  economics: "#0ea5e9",
  business: "#64748b",
};

function subjectColor(id: string): string {
  return SUBJECT_COLORS[id] ?? "#8b5cf6";
}

function subjectIcon(id: string): string {
  const entry = SUBJECT_CATALOG.find((s) => s.id === id);
  return entry?.icon ?? "book-open-variant";
}

function subjectLabel(id: string): string {
  const entry = SUBJECT_CATALOG.find((s) => s.id === id);
  return entry?.label ?? id;
}

function ProgressCircle({ percent, size = 48, strokeWidth = 4, color }: { percent: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill = Math.max(0, Math.min(100, percent));
  const offset = circumference - (fill / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: `${color}20`,
          position: "absolute",
        }}
      />
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text variant="labelSmall" style={{ fontWeight: "700", color, fontSize: Math.max(10, size * 0.22) }}>
          {Math.round(fill)}%
        </Text>
      </View>
    </View>
  );
}

export default function StudyMapScreen() {
  const paperTheme = useTheme();

  const navigation = useNavigation<any>();
  const { data, loading } = useQuery(STUDY_MAP);

  const mapEntries = (data?.studyMap ?? []) as {
    subjectId: string;
    progressPercent: number;
    masteredTopics: number;
    totalTopics: number;
  }[];

  const curriculumSubjects = mapEntries.length > 0
    ? mapEntries
    : SUBJECT_CATALOG.map((s) => ({
        subjectId: s.id,
        progressPercent: 0,
        masteredTopics: 0,
        totalTopics: 0,
      }));

  return (
    <ExpressiveScreen
      title="Study Map"
      subtitle="Your learning progress across all subjects"
      leadingIcon="map"
    >
      {loading ? (
        <View style={{ padding: 32, alignItems: "center" }}>
          <ActivityIndicator size="large" color={paperTheme.colors.primary} />
        </View>
      ) : curriculumSubjects.length === 0 ? (
        <ExpressiveEmptyState
          icon="map-outline"
          title="No subjects yet"
          subtitle="Add subjects to start tracking your learning progress."
        />
      ) : (
        <ExpressiveSection title="Progress overview">
          <View style={{ gap: 10 }}>
            {curriculumSubjects.map((entry) => {
              const color = subjectColor(entry.subjectId);
              const icon = subjectIcon(entry.subjectId);
              const label = subjectLabel(entry.subjectId);
              const mastered = entry.masteredTopics ?? 0;
              const total = entry.totalTopics ?? 0;
              const percent = entry.progressPercent ?? 0;

              return (
                <PressableScale
                  key={entry.subjectId}
                  onPress={() => navigation.navigate("StudyMapSubject", { subjectId: entry.subjectId })}
                >
                  <View style={[styles.card, { backgroundColor: paperTheme.colors.surface, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }]}>
                    <View style={[styles.iconBox, { backgroundColor: `${color}16` }]}>
                      <Icon name={icon} size={22} color={color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text variant="bodyLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>
                        {label}
                      </Text>
                      <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 2 }}>
                        {mastered} of {total} topics mastered
                      </Text>
                      <View style={[styles.progressBar, { backgroundColor: `${color}20` }]}>
                        <View style={[styles.progressFill, { width: `${Math.max(2, percent)}%`, backgroundColor: color }]} />
                      </View>
                    </View>
                    <ProgressCircle percent={percent} size={42} strokeWidth={3.5} color={color} />
                    <Icon name="chevron-right" size={18} color={paperTheme.colors.onSurfaceVariant} style={{ marginLeft: 8 }} />
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </ExpressiveSection>
      )}
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: SHAPE.lg,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
});

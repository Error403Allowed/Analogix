import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useQuery } from "@apollo/client/react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { getCurriculum } from "@analogix/shared/curriculum";
import type { CurriculumSubject, GradeCurriculum, CurriculumStrand, CurriculumTopic } from "@analogix/shared/curriculum";
import { STUDY_MAP } from "../../graphql/queries/subject";
import {
  ExpressiveScreen,
  ExpressiveSection,
  ExpressiveEmptyState,
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

export default function StudyMapSubjectScreen() {
  const paperTheme = useTheme();

  const route = useRoute<any>();
  const navigation = useNavigation();
  const { subjectId } = route.params as { subjectId: string };
  const { data } = useQuery(STUDY_MAP);

  const curriculum = useMemo(() => {
    const all = getCurriculum();
    return all.find((s: CurriculumSubject) => s.id === subjectId) ?? null;
  }, [subjectId]);

  const mapEntry = (data?.studyMap ?? []).find(
    (e: { subjectId: string }) => e.subjectId === subjectId
  );

  const color = subjectColor(subjectId);
  const icon = subjectIcon(subjectId);
  const label = subjectLabel(subjectId);
  const percent = mapEntry?.progressPercent ?? 0;
  const mastered = mapEntry?.masteredTopics ?? 0;
  const total = mapEntry?.totalTopics ?? 0;

  if (!curriculum) {
    return (
      <ExpressiveScreen
        title={label}
        subtitle="Subject curriculum"
        leadingIcon={icon}
        onBack={() => navigation.goBack()}
      >
        <ExpressiveEmptyState
          icon="map-outline"
          title="Curriculum not found"
          subtitle="This subject doesn't have a curriculum mapped yet."
        />
      </ExpressiveScreen>
    );
  }



  return (
    <ExpressiveScreen
      title={label}
      subtitle={`${Math.round(percent)}% complete`}
      leadingIcon={icon}
      onBack={() => navigation.goBack()}
    >
      <ExpressiveSection
        title="Overview"
        actionLabel={total > 0 ? `${mastered}/${total} topics` : undefined}
      >
        <View style={[styles.overviewCard, { backgroundColor: paperTheme.colors.surface, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }]}>
          <View style={[styles.overviewIcon, { backgroundColor: `${color}16` }]}>
            <Icon name={icon} size={28} color={color} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text variant="titleMedium" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>
              {label}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: `${color}20`, marginTop: 10 }]}>
              <View style={[styles.progressFill, { width: `${Math.max(2, percent)}%`, backgroundColor: color }]} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                {mastered} mastered
              </Text>
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                {total} total
              </Text>
            </View>
          </View>
        </View>
      </ExpressiveSection>

      {curriculum.grades.map((grade: GradeCurriculum) => (
        <ExpressiveSection
          key={grade.grade}
          title={`Year ${grade.grade}`}
        >
          <View style={{ gap: 8 }}>
            {grade.strands.map((strand: CurriculumStrand) => (
              <View
                key={strand.id}
                style={[styles.strandCard, { backgroundColor: paperTheme.colors.surface, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }]}
              >
                <View style={[styles.strandHeader, { borderLeftColor: color, borderLeftWidth: 3, paddingLeft: 12 }]}>
                  <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>
                    {strand.name}
                  </Text>
                  {strand.description ? (
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 2 }}>
                      {strand.description}
                    </Text>
                  ) : null}
                </View>
                {strand.topics.length > 0 && (
                  <View style={[styles.topicsList, { borderTopColor: paperTheme.colors.outlineVariant, borderTopWidth: StyleSheet.hairlineWidth }]}>
                    {strand.topics.map((topic: CurriculumTopic) => (
                      <View key={topic.id} style={styles.topicRow}>
                        <View style={[styles.topicDot, { backgroundColor: `${color}40` }]} />
                        <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurface, flex: 1 }}>
                          {topic.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ExpressiveSection>
      ))}
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  overviewCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: SHAPE.lg,
  },
  overviewIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  strandCard: {
    borderRadius: SHAPE.lg,
    overflow: "hidden",
  },
  strandHeader: {
    padding: 14,
  },
  topicsList: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 8,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  topicDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

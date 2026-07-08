import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import Icon from "../../components/Icon";
import { ExpressiveScreen, ExpressiveEmptyState } from "../../components/expressive";
import { CURRICULUM_SUBJECTS } from "../../graphql/queries/curriculum";
import { SHAPE } from "../../theme/tokens";

type Topic = { id: string; strand: string; topic: string; contentDescription: string; elaborations: string[] };
type Strands = Record<string, Topic[]>;
type YearLevel = { year: number; strands: Strands; achievementStandard: string };
type Subject = { subject: string; learningArea: string; yearLevels: Record<string, YearLevel> };

function TopicCard({ topic, colors, brand }: { topic: Topic; colors: any; brand: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={[styles.topicCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
    >
      <View style={styles.topicHeader}>
        <Text style={[styles.topicCode, { color: brand.primary }]}>{topic.id}</Text>
        <Text style={[styles.topicName, { color: colors.onSurface }]}>{topic.topic}</Text>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.onSurfaceVariant} />
      </View>
      <Text style={[styles.contentDesc, { color: colors.onSurfaceVariant }]} numberOfLines={expanded ? undefined : 2}>
        {topic.contentDescription}
      </Text>
      {expanded && topic.elaborations.length > 0 && (
        <View style={[styles.elabSection, { borderTopColor: colors.outlineVariant }]}>
          {topic.elaborations.map((elab, i) => (
            <View key={i} style={styles.elabRow}>
              <Text style={[styles.elabBullet, { color: brand.primary }]}>•</Text>
              <Text style={[styles.elabText, { color: colors.onSurfaceVariant }]}>{elab}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function StrandSection({ strand, topics, colors, brand }: { strand: string; topics: Topic[]; colors: any; brand: any }) {
  return (
    <View style={styles.strandSection}>
      <Text style={[styles.strandLabel, { color: brand.primary }]}>{strand}</Text>
      <View style={styles.topicList}>
        {topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} colors={colors} brand={brand} />
        ))}
      </View>
    </View>
  );
}

export default function CurriculumBrowserScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation();
  const { loading, error, data } = useQuery(CURRICULUM_SUBJECTS);

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const subjects: Subject[] = useMemo(() => {
    if (!data?.curriculumSubjects) return [];
    return data.curriculumSubjects.map((s: any) => ({
      ...s,
      yearLevels: typeof s.yearLevels === "string" ? JSON.parse(s.yearLevels) : s.yearLevels,
    }));
  }, [data]);

  const subject = subjects.find((s) => s.subject === selectedSubject);
  const years = subject ? Object.keys(subject.yearLevels).sort() : [];
  const yearLevel = selectedYear && subject ? subject.yearLevels[selectedYear] : null;

  const { colors } = paperTheme;
  const c = colors;

  if (loading) {
    return (
      <ExpressiveScreen title="Curriculum">
        <View style={styles.center}><ActivityIndicator size="large" color={brand.primary} /></View>
      </ExpressiveScreen>
    );
  }

  if (error) {
    return (
      <ExpressiveScreen title="Curriculum">
        <ExpressiveEmptyState icon="alert-circle" title="Failed to load" subtitle={error.message} />
      </ExpressiveScreen>
    );
  }

  return (
    <ExpressiveScreen title="Curriculum" subtitle="ACARA Australian Curriculum" leadingIcon="book-open-variant">
      {!selectedSubject ? (
        <View style={styles.grid}>
          {subjects.map((s) => (
            <Pressable
              key={s.subject}
              onPress={() => setSelectedSubject(s.subject)}
              style={[styles.subjectCard, { backgroundColor: c.surface, borderColor: c.outlineVariant }]}
            >
              <Text style={[styles.subjectName, { color: c.onSurface }]}>{s.subject}</Text>
              <Text style={[styles.subjectArea, { color: c.onSurfaceVariant }]}>{s.learningArea}</Text>
              <Text style={[styles.yearCount, { color: brand.primary }]}>
                {Object.keys(s.yearLevels).length} year levels
              </Text>
            </Pressable>
          ))}
        </View>
      ) : !selectedYear ? (
        <View style={styles.section}>
          <Pressable onPress={() => setSelectedSubject(null)} style={styles.backRow}>
            <Icon name="arrow-left" size={18} color={brand.primary} />
            <Text style={[styles.backText, { color: brand.primary }]}>All subjects</Text>
          </Pressable>
          <Text style={[styles.sectionTitle, { color: c.onSurface }]}>Select Year Level</Text>
          <View style={styles.yearGrid}>
            {years.map((year) => (
              <Pressable
                key={year}
                onPress={() => setSelectedYear(year)}
                style={[styles.yearCard, { backgroundColor: c.surface, borderColor: c.outlineVariant }]}
              >
                <Text style={[styles.yearNum, { color: brand.primary }]}>Year {year}</Text>
                <Text style={[styles.yearStrands, { color: c.onSurfaceVariant }]}>
                  {Object.keys(subject!.yearLevels[year].strands).length} strands
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Pressable onPress={() => setSelectedYear(null)} style={styles.backRow}>
            <Icon name="arrow-left" size={18} color={brand.primary} />
            <Text style={[styles.backText, { color: brand.primary }]}>
              {subject?.subject} — Year {selectedYear}
            </Text>
          </Pressable>

          {yearLevel && (
            <>
              <View style={[styles.achievementBox, { backgroundColor: brand.primary + "10", borderColor: brand.primary + "30" }]}>
                <Text style={[styles.achievementLabel, { color: brand.primary }]}>Achievement Standard</Text>
                <Text style={[styles.achievementText, { color: c.onSurface }]}>{yearLevel.achievementStandard}</Text>
              </View>

              {Object.entries(yearLevel.strands).map(([strand, topics]) => (
                <StrandSection key={strand} strand={strand} topics={topics} colors={c} brand={brand} />
              ))}
            </>
          )}
        </View>
      )}
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  grid: { padding: 12, gap: 10 },
  subjectCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  subjectName: { fontSize: 18, fontWeight: "700" },
  subjectArea: { fontSize: 12, marginTop: 2 },
  yearCount: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  section: { padding: 12 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: "600" },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  yearGrid: { gap: 10 },
  yearCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  yearNum: { fontSize: 16, fontWeight: "700" },
  yearStrands: { fontSize: 12 },
  achievementBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  achievementLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6 },
  achievementText: { fontSize: 13, lineHeight: 19 },
  strandSection: { marginBottom: 16 },
  strandLabel: { fontSize: 14, fontWeight: "700", marginBottom: 8, letterSpacing: 0.3 },
  topicList: { gap: 8 },
  topicCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  topicHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topicCode: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  topicName: { fontSize: 13, fontWeight: "600", flex: 1 },
  contentDesc: { fontSize: 12, marginTop: 6, lineHeight: 17 },
  elabSection: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8 },
  elabRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  elabBullet: { fontSize: 12, lineHeight: 17 },
  elabText: { fontSize: 12, lineHeight: 17, flex: 1 },
});

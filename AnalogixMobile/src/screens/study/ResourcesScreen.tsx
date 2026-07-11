import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Linking,
  Platform,
} from "react-native";
import { Text, useTheme, ActivityIndicator, Chip } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Icon from "../../components/Icon";
import { ExpressiveScreen, ExpressiveEmptyState } from "../../components/expressive";
import { CURATED_RESOURCES } from "../../graphql/queries/curatedResource";
import { SHAPE } from "../../theme/tokens";

type Tab = "pastPapers" | "textbooks";
type ResourceLink = { title: string; url: string; description?: string; free?: boolean; states?: string[] };
type SubjectResources = { subjectId: string; pastPapers: ResourceLink[]; textbooks: ResourceLink[] };

const SUBJECT_LABELS: Record<string, string> = {
  math: "Mathematics",
  biology: "Biology",
  history: "History",
  physics: "Physics",
  chemistry: "Chemistry",
  english: "English",
  computing: "Computing",
  economics: "Economics",
  business: "Business Studies",
  commerce: "Commerce",
  pdhpe: "PDHPE",
  geography: "Geography",
  engineering: "Engineering",
  medicine: "Medicine",
  languages: "Languages",
};

function ResourceCard({ resource, colors }: { resource: ResourceLink; colors: any }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => Linking.openURL(resource.url)}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.resourceCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
      >
        <View style={styles.resourceCardTop}>
          <Text style={[styles.resourceTitle, { color: colors.onSurface }]} numberOfLines={2}>
            {resource.title}
          </Text>
          {resource.free && (
            <View style={[styles.freeBadge, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.freeBadgeText, { color: colors.primary }]}>Free</Text>
            </View>
          )}
        </View>
        {resource.description ? (
          <Text style={[styles.resourceDesc, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
            {resource.description}
          </Text>
        ) : null}
        {resource.states && resource.states.length > 0 && (
          <Text style={[styles.stateLabel, { color: colors.onSurfaceVariant }]}>
            {resource.states.join(", ")}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function ResourcesScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation();
  const { loading, error, data } = useQuery(CURATED_RESOURCES);
  const [query, setQuery] = useState("");
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("pastPapers");
  const searchRef = useRef<TextInput>(null);

  const resources: SubjectResources[] = useMemo(() => data?.curatedResources ?? [], [data?.curatedResources]);

  const matchesQuery = useCallback(
    (link: ResourceLink) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return link.title.toLowerCase().includes(q) || (link.description?.toLowerCase().includes(q) ?? false);
    },
    [query]
  );

  const filteredResources = useMemo(() => {
    if (!activeSubjectId && !query) return resources;
    if (query) {
      return resources.filter((sr) => {
        const label = SUBJECT_LABELS[sr.subjectId] ?? sr.subjectId;
        const subjectMatch = label.toLowerCase().includes(query.toLowerCase());
        const papersMatch = sr.pastPapers.some(matchesQuery);
        const booksMatch = sr.textbooks.some(matchesQuery);
        return subjectMatch || papersMatch || booksMatch;
      });
    }
    return resources.filter((r) => r.subjectId === activeSubjectId);
  }, [resources, activeSubjectId, query, matchesQuery]);

  const activeResource = resources.find((r) => r.subjectId === activeSubjectId);

  useFocusEffect(
    useCallback(() => {
      if (!activeSubjectId && resources.length > 0) {
        setActiveSubjectId(resources[0].subjectId);
      }
    }, [resources, activeSubjectId])
  );

  const { colors } = paperTheme;
  const c = colors;

  if (loading) {
    return (
      <ExpressiveScreen title="Resources">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      </ExpressiveScreen>
    );
  }

  if (error) {
    return (
      <ExpressiveScreen title="Resources">
        <ExpressiveEmptyState icon="alert-circle" title="Failed to load" subtitle={error.message} />
      </ExpressiveScreen>
    );
  }

  const isSearching = query.trim().length > 0;

  const visiblePapers = isSearching
    ? filteredResources.flatMap((sr) =>
        sr.pastPapers.filter(matchesQuery).map((l) => ({ ...l, subjectId: sr.subjectId }))
      )
    : activeResource?.pastPapers.filter(matchesQuery) ?? [];

  const visibleTextbooks = isSearching
    ? filteredResources.flatMap((sr) =>
        sr.textbooks.filter(matchesQuery).map((l) => ({ ...l, subjectId: sr.subjectId }))
      )
    : activeResource?.textbooks.filter(matchesQuery) ?? [];

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "pastPapers", label: "Past Papers", icon: "file-document-outline" },
    { key: "textbooks", label: "Textbooks & Links", icon: "book-open-outline" },
  ];

  return (
    <ExpressiveScreen title="Resources" subtitle="Past papers, textbooks and study links" leadingIcon="bookmark-multiple">
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: c.surfaceVariant, borderColor: c.outlineVariant }]}>
          <Icon name="magnify" size={18} color={c.onSurfaceVariant} />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search resources…"
            placeholderTextColor={c.onSurfaceVariant + "80"}
            style={[styles.searchInput, { color: c.onSurface }]}
          />
          {query ? (
            <Pressable onPress={() => { setQuery(""); searchRef.current?.focus(); }}>
              <Icon name="close-circle" size={18} color={c.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Subject sidebar */}
      {!isSearching ? (
        <View style={styles.subjectSidebar}>
          {resources.map((sr) => {
            const active = activeSubjectId === sr.subjectId;
            return (
              <Pressable
                key={sr.subjectId}
                onPress={() => setActiveSubjectId(sr.subjectId)}
                style={[
                  styles.subjectChip,
                  {
                    backgroundColor: active ? brand.primary : c.surfaceVariant,
                    borderColor: active ? brand.primary : c.outlineVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    { color: active ? "#FFFFFF" : c.onSurface },
                  ]}
                  numberOfLines={1}
                >
                  {SUBJECT_LABELS[sr.subjectId] ?? sr.subjectId}
                </Text>
                <Text
                  style={[
                    styles.subjectChipSub,
                    { color: active ? "#FFFFFFcc" : c.onSurfaceVariant },
                  ]}
                >
                  {sr.pastPapers.length} papers · {sr.textbooks.length} books
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Tabs — not in search mode */}
      {!isSearching ? (
        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? brand.primary : c.surfaceVariant,
                    borderColor: active ? brand.primary : c.outlineVariant,
                  },
                ]}
              >
                <Icon name={tab.icon} size={14} color={active ? "#FFFFFF" : c.onSurfaceVariant} />
                <Text style={[styles.tabText, { color: active ? "#FFFFFF" : c.onSurfaceVariant }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Results */}
      <View style={styles.resultsWrap}>
        {isSearching && activeTab === "pastPapers" && visiblePapers.length === 0 ? (
          <ExpressiveEmptyState icon="file-search" title="No past papers" subtitle={`No past papers match "${query}".`} />
        ) : isSearching && activeTab === "textbooks" && visibleTextbooks.length === 0 ? (
          <ExpressiveEmptyState icon="file-search" title="No textbooks" subtitle={`No textbooks match "${query}".`} />
        ) : activeTab === "pastPapers" ? (
          <View style={styles.cardGrid}>
            {visiblePapers.map((link, i) => (
              <ResourceCard key={i} resource={link} colors={c} />
            ))}
          </View>
        ) : (
          <View style={styles.cardGrid}>
            {visibleTextbooks.map((link, i) => (
              <ResourceCard key={i} resource={link} colors={c} />
            ))}
          </View>
        )}
      </View>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: SHAPE.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0, height: 42 },
  subjectSidebar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  subjectChip: {
    borderRadius: SHAPE.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  subjectChipText: { fontSize: 14, fontWeight: "700" },
  subjectChipSub: { fontSize: 11, marginTop: 2 },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: SHAPE.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tabText: { fontSize: 12, fontWeight: "700" },
  resultsWrap: { paddingHorizontal: 16, paddingBottom: 24 },
  cardGrid: { gap: 8 },
  resourceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  resourceCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  resourceTitle: { fontSize: 14, fontWeight: "600", flex: 1 },
  freeBadge: {
    borderRadius: SHAPE.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  freeBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  resourceDesc: { fontSize: 12, marginTop: 6, lineHeight: 16 },
  stateLabel: { fontSize: 10, marginTop: 4, fontWeight: "600" },
});

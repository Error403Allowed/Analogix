import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  TextInput,
} from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { FORMULA_SHEETS, SEARCH_FORMULAS } from "../../graphql/queries/misc";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Animated, {
  FadeInDown,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Icon from "../../components/Icon";
import FormulaRenderer from "../../components/FormulaRenderer";
import { ExpressiveScreen, ExpressiveEmptyState } from "../../components/expressive";
import { SkeletonList } from "../../components/SkeletonLoader";

function FilterChip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.94); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[
          styles.filterChip,
          active
            ? { backgroundColor: color, borderColor: color }
            : { backgroundColor: "transparent", borderColor: color + "40" },
        ]}
      >
        <Text
          style={[
            styles.filterChipText,
            { color: active ? "#fff" : color },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function FormulaCard({
  name,
  latex,
  description,
  subjectColor,
  subjectName,
  catName,
  themeSurface,
  themeOutlineVariant,
  themeOnSurface,
  themeOnSurfaceVariant,
}: {
  name: string;
  latex: string;
  description?: string;
  subjectColor: string;
  subjectName?: string;
  catName?: string;
  themeSurface: string;
  themeOutlineVariant: string;
  themeOnSurface: string;
  themeOnSurfaceVariant: string;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(250).springify().damping(22)}>
      <View
        style={[
          styles.formulaCard,
          { backgroundColor: themeSurface, borderColor: themeOutlineVariant },
        ]}
      >
        <View style={styles.formulaCardHeader}>
          <Text
            style={[styles.formulaName, { color: themeOnSurface }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {catName ? (
              <View style={[styles.formulaBadge, { backgroundColor: subjectColor + "14" }]}>
                <Text style={[styles.formulaBadgeText, { color: subjectColor }]}>
                  {catName}
                </Text>
              </View>
            ) : null}
            {subjectName ? (
              <View style={[styles.formulaBadge, { backgroundColor: subjectColor + "14" }]}>
                <Text style={[styles.formulaBadgeText, { color: subjectColor }]}>
                  {subjectName}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.latexBox,
            { backgroundColor: subjectColor + "06", borderColor: themeOutlineVariant },
          ]}
        >
          <FormulaRenderer math={latex} style={styles.formulaPreview} minHeight={36} />
        </View>

        {description ? (
          <Text
            style={[styles.formulaDesc, { color: themeOnSurfaceVariant }]}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export default function FormulasScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const [q, setQ] = useState("");
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const searchRef = useRef<TextInput>(null);

  const { data, loading } = useQuery(FORMULA_SHEETS);
  const { data: searchData, loading: searchLoading } = useQuery(SEARCH_FORMULAS, {
    variables: { query: q.trim() },
    skip: q.trim().length < 2,
  });

  const sheets = useMemo(() => data?.formulaSheets ?? [], [data]);
  const searchResults = useMemo(() => searchData?.searchFormulas ?? [], [searchData]);
  const isSearching = q.trim().length >= 2;

  const subjectNames = useMemo(
    () => [...new Set(sheets.map((s: any) => s.subjectName))] as string[],
    [sheets],
  );

  const subjectGroups = useMemo(() => {
    const groups: Array<{
      subjectId: string;
      subjectName: string;
      categories: any[];
    }> = [];

    for (const sheet of sheets) {
      groups.push({
        subjectId: sheet.subjectId,
        subjectName: sheet.subjectName,
        categories: sheet.categories ?? [],
      });
    }

    if (activeSubject) {
      return groups.filter((g) => g.subjectId === activeSubject);
    }
    return groups;
  }, [sheets, activeSubject]);

  const topics = useMemo(() => {
    if (!activeSubject) return [];
    const subject = sheets.find((s: any) => s.subjectId === activeSubject);
    if (!subject) return [];
    return (subject.categories ?? []).map((c: any) => c.name) as string[];
  }, [activeSubject, sheets]);

  const filteredGroups = useMemo(() => {
    if (!activeTopic) return subjectGroups;
    return subjectGroups
      .map((g) => ({
        ...g,
        categories: g.categories.filter((c: any) => c.name === activeTopic),
      }))
      .filter((g) => g.categories.length > 0);
  }, [subjectGroups, activeTopic]);

  const searchGroups = useMemo(() => {
    if (!isSearching || searchResults.length === 0) return [];
    const map = new Map<
      string,
      { subjectId: string; subjectName: string; formulas: any[] }
    >();
    searchResults.forEach((f: any) => {
      const key = f.subjectId ?? "general";
      if (!map.has(key)) {
        map.set(key, {
          subjectId: key,
          subjectName: f.subjectName ?? key,
          formulas: [],
        });
      }
      map.get(key)!.formulas.push(f);
    });
    return Array.from(map.values());
  }, [isSearching, searchResults]);

  const formulaCount = useMemo(
    () =>
      filteredGroups.reduce(
        (sum, g) =>
          sum +
          g.categories.reduce((s: any, c: any) => s + (c.formulas?.length ?? 0), 0),
        0,
      ),
    [filteredGroups],
  );

  const handleClear = useCallback(() => {
    setQ("");
    setActiveSubject(null);
    setActiveTopic(null);
  }, []);

  const {
    onSurface,
    onSurfaceVariant,
    surface,
    outlineVariant,
    surfaceVariant,
    background,
  } = paperTheme.colors;

  return (
    <ExpressiveScreen
      title="Formulas"
      eyebrow="Reference"
      leadingIcon="sigma"
      onBack={() => navigation.goBack()}
      scroll={false}
      contentStyle={{ padding: 0, gap: 0 }}
    >
      <View style={[styles.searchWrap, { backgroundColor: background }]}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: surfaceVariant, borderColor: outlineVariant },
          ]}
        >
          <Icon name="magnify" size={18} color={onSurfaceVariant} />
          <TextInput
            ref={searchRef}
            value={q}
            onChangeText={(v) => setQ(v)}
            placeholder="Search formulas..."
            placeholderTextColor={onSurfaceVariant + "80"}
            style={[styles.searchInput, { color: onSurface }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {q.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8}>
              <Icon name="close-circle" size={18} color={onSurfaceVariant} />
            </Pressable>
          )}
        </View>
      </View>

      {!isSearching && subjectNames.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={{ backgroundColor: background }}
        >
          <FilterChip
            label="All"
            active={!activeSubject}
            onPress={() => {
              setActiveSubject(null);
              setActiveTopic(null);
            }}
            color={brand.primary}
          />
          {subjectNames.map((name) => {
            const sheet = sheets.find((s: any) => s.subjectName === name);
            const isActive = activeSubject === sheet?.subjectId;
            return (
              <FilterChip
                key={name}
                label={name}
                active={isActive}
                onPress={() => {
                  setActiveSubject(isActive ? null : (sheet?.subjectId ?? null));
                  setActiveTopic(null);
                }}
                color={brand.primary}
              />
            );
          })}
        </ScrollView>
      )}

      {!isSearching && activeSubject && topics.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicRow}
          style={{ backgroundColor: background }}
        >
          <FilterChip
            label="All Topics"
            active={!activeTopic}
            onPress={() => setActiveTopic(null)}
            color={brand.primary}
          />
          {topics.map((topic) => (
            <FilterChip
              key={topic}
              label={topic}
              active={activeTopic === topic}
              onPress={() =>
                setActiveTopic(activeTopic === topic ? null : topic)
              }
              color={brand.primary + "aa"}
            />
          ))}
        </ScrollView>
      )}

      <View
        style={[
          styles.subtitleBar,
          { backgroundColor: surface, borderBottomColor: outlineVariant },
        ]}
      >
        <Text style={[styles.subtitleText, { color: onSurfaceVariant }]}>
          {isSearching
            ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`
            : `${formulaCount} formula${formulaCount !== 1 ? "s" : ""}`}
        </Text>
      </View>

      <ScrollView
        style={[styles.scrollArea, { backgroundColor: background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading || searchLoading ? (
          <SkeletonList count={3} style={{ marginTop: 8 }} />
        ) : isSearching && searchResults.length === 0 ? (
          <ExpressiveEmptyState
            icon="sigma"
            title="No results"
            subtitle="Try a different search term."
          />
        ) : isSearching ? (
          searchGroups.map((group) => (
            <View key={group.subjectId} style={styles.groupSection}>
              <Text
                style={[styles.sectionTitle, { color: brand.primary }]}
              >
                {group.subjectName}
              </Text>
              {group.formulas.map((f: any) => (
                <FormulaCard
                  key={f.id}
                  name={f.name}
                  latex={f.latex}
                  description={f.description}
                  subjectColor={brand.primary}
                  catName={f.category}
                  themeSurface={surface}
                  themeOutlineVariant={outlineVariant}
                  themeOnSurface={onSurface}
                  themeOnSurfaceVariant={onSurfaceVariant}
                />
              ))}
            </View>
          ))
        ) : formulaCount === 0 ? (
          <ExpressiveEmptyState
            icon="sigma"
            title="No formulas"
            subtitle="No formulas available yet."
          />
        ) : (
          filteredGroups.map((group) => (
            <View key={group.subjectId} style={styles.groupSection}>
              <Text style={[styles.sectionTitle, { color: onSurface }]}>
                {group.subjectName}
              </Text>
              {group.categories.map((cat: any) => (
                <View key={cat.name} style={styles.categoryBlock}>
                  <View
                    style={[
                      styles.categoryHeader,
                      { backgroundColor: brand.primary + "10" },
                    ]}
                  >
                    <Icon
                      name="book"
                      size={16}
                      color={brand.primary}
                    />
                    <Text
                      style={[
                        styles.categoryName,
                        { color: onSurface },
                      ]}
                    >
                      {cat.name}
                    </Text>
                    <Text
                      style={[
                        styles.categoryCount,
                        { color: onSurfaceVariant },
                      ]}
                    >
                      {cat.formulas.length}
                    </Text>
                  </View>
                  {cat.formulas.map((f: any) => (
                    <FormulaCard
                      key={f.id}
                      name={f.name}
                      latex={f.latex}
                      description={f.description}
                      subjectColor={brand.primary}
                      themeSurface={surface}
                      themeOutlineVariant={outlineVariant}
                      themeOnSurface={onSurface}
                      themeOnSurfaceVariant={onSurfaceVariant}
                    />
                  ))}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: SHAPE.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    height: 42,
  },

  chipRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: SHAPE.pill,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
  },

  topicRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 6,
  },

  subtitleBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: "600",
  },

  scrollArea: { flex: 1 },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },

  groupSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  categoryBlock: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: SHAPE.sm,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: "600",
  },

  formulaCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  formulaCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  formulaName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  formulaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SHAPE.pill,
  },
  formulaBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  latexBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
  },
  formulaPreview: {
    marginVertical: 2,
  },
  formulaDesc: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
});

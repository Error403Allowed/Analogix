import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FORMULA_SHEETS, SEARCH_FORMULAS } from "../../graphql/queries/misc";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Icon from "../../components/Icon";
import BatchFormulaRenderer from "../../components/BatchFormulaRenderer";
import FormulaRenderer from "../../components/FormulaRenderer";
import { renderLatex, KATEX_CSS } from "../../utils/katexUtils";
import { ExpressiveScreen, ExpressiveEmptyState } from "../../components/expressive";
import { SkeletonList } from "../../components/SkeletonLoader";
import { FORMULA_SHEET_DATA } from "@analogix/shared/formulas";

const FAVORITES_KEY = "formula_favorites";

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

if (Platform.OS === "web" && typeof document !== "undefined" && !document.getElementById("katex-css")) {
  const style = document.createElement("style");
  style.id = "katex-css";
  style.textContent = KATEX_CSS;
  document.head.appendChild(style);
}

function WebFormulaCard({ name, latex, description, onPress, onToggleFavorite, isFavorite }: { name: string; latex: string; description?: string; onPress?: () => void; onToggleFavorite?: () => void; isFavorite?: boolean }) {
  const { colors } = useTheme();
  const { isDark } = useThemeContext();
  const latexRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (latexRef.current) {
      latexRef.current.innerHTML = renderLatex(latex, true);
    }
  }, [latex]);

  useEffect(() => {
    if (!isDark || !latexRef.current) return;
    const style = document.createElement("style");
    style.textContent = ".katex,.katex .katex-html,.katex .katex-mathml,.katex .base,.katex .strut{color:#e5e7eb}";
    latexRef.current.parentElement!.insertBefore(style, latexRef.current);
    return () => style.remove();
  }, [isDark]);

  const bg = colors.surface;
  const border = colors.outlineVariant;
  const text = colors.onSurface;
  const desc = colors.onSurfaceVariant;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.formulaCard, { backgroundColor: bg, borderColor: border }, pressed && Platform.OS === "web" ? { opacity: 0.8 } : null]}>
      <View style={styles.formulaCardTop}>
        <Text style={[styles.formulaName, { color: text }]} numberOfLines={1}>{name}</Text>
        {onToggleFavorite && (
          <Pressable onPress={onToggleFavorite} hitSlop={8}>
            <Icon name={isFavorite ? "star" : "star-outline"} size={16} color={isFavorite ? "#F59E0B" : desc} />
          </Pressable>
        )}
      </View>
      <View style={[styles.latexBox, { backgroundColor: bg, borderColor: border }]}>
        <div ref={latexRef} />
      </View>
      {description ? (
        <Text style={[styles.formulaDesc, { color: desc }]} numberOfLines={2}>{description}</Text>
      ) : null}
    </Pressable>
  );
}

export default function FormulasScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const [q, setQ] = useState("");
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favsLoaded, setFavsLoaded] = useState(false);
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then((v) => {
      if (v) setFavorites(new Set(JSON.parse(v)));
      setFavsLoaded(true);
    });
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavorites(next);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
  }, [favorites]);

  const handleFormulaPress = useCallback((formulaId: string, subjectId: string, subjectName: string, categoryName: string) => {
    navigation.navigate("FormulaDetail", { formulaId, subjectId, subjectName, categoryName });
  }, [navigation]);

  const { data } = useQuery(FORMULA_SHEETS);
  const { data: searchData, loading: searchLoading } = useQuery(SEARCH_FORMULAS, {
    variables: { query: q.trim() },
    skip: q.trim().length < 2,
  });

  const sheets = useMemo(() => {
    return FORMULA_SHEET_DATA;
  }, []);
  const searchResults = useMemo(() => {
    if (searchData?.searchFormulas?.length) return searchData.searchFormulas;
    if (!data?.formulaSheets?.length && !searchData) {
      return [];
    }
    return [];
  }, [searchData, data]);
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

  const favoriteFormulas = useMemo(() => {
    if (favorites.size === 0 || !favsLoaded) return [];
    const result: Array<{ formula: any; subjectId: string; subjectName: string; categoryName: string }> = [];
    for (const sheet of sheets) {
      for (const cat of sheet.categories) {
        for (const f of cat.formulas) {
          const id = f.id || f.name || "";
          if (favorites.has(id)) {
            result.push({ formula: f, subjectId: sheet.subjectId, subjectName: sheet.subjectName, categoryName: cat.name });
          }
        }
      }
    }
    return result;
  }, [sheets, favorites, favsLoaded]);

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

  const formulaTheme = useMemo(() => ({
    text: onSurface,
    textSecondary: onSurfaceVariant,
    cardBg: surface,
    cardBorder: outlineVariant,
    descBg: surfaceVariant,
    descText: onSurfaceVariant,
    fallbackBg: surfaceVariant,
    fallbackText: onSurfaceVariant,
  }), [onSurface, onSurfaceVariant, surface, outlineVariant, surfaceVariant]);

  return (
    <ExpressiveScreen
      title="Formulas"
      eyebrow="Reference"
      leadingIcon="sigma"
      onBack={() => navigation.goBack()}
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

      {!isSearching && favoriteFormulas.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={[styles.sectionLabel, { color: brand.primary }]}>Favorites</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {favoriteFormulas.slice(0, 8).map((item) => {
              const id = item.formula.id || item.formula.name || "";
              return (
                <Pressable
                  key={id}
                  onPress={() => handleFormulaPress(id, item.subjectId, item.subjectName, item.categoryName)}
                  style={[styles.favoriteCard, { backgroundColor: surface, borderColor: outlineVariant }]}
                >
                  <Text style={[styles.favCardName, { color: onSurface }]} numberOfLines={1}>{item.formula.name}</Text>
                  <Text style={[styles.favCardSubject, { color: onSurfaceVariant }]}>{item.subjectName}</Text>
                  <Pressable onPress={() => toggleFavorite(id)} hitSlop={8} style={{ position: "absolute", top: 6, right: 6 }}>
                    <Icon name="star" size={14} color="#F59E0B" />
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {searchLoading ? (
        <SkeletonList count={3} style={{ marginTop: 8 }} />
      ) : isSearching && searchResults.length === 0 ? (
        <ExpressiveEmptyState
          icon="sigma"
          title="No results"
          subtitle="Try a different search term."
        />
      ) : formulaCount === 0 && !isSearching ? (
        <ExpressiveEmptyState
          icon="sigma"
          title="No formulas"
          subtitle="No formulas available yet."
        />
      ) : Platform.OS === "web" ? (
        <View style={styles.scrollContent}>
        {isSearching
          ? searchGroups.map((group) => (
              <View key={group.subjectId} style={styles.groupSection}>
                <Text style={[styles.sectionTitle, { color: brand.primary }]}>
                  {group.subjectName}
                </Text>
                  {group.formulas.map((f: any) => {
                    const fid = f.id || f.name || "";
                    return (
                      <WebFormulaCard
                        key={fid}
                        name={f.name}
                        latex={f.latex}
                        description={f.description}
                        onPress={() => handleFormulaPress(fid, group.subjectId, group.subjectName, group.subjectName)}
                        onToggleFavorite={() => toggleFavorite(fid)}
                        isFavorite={favorites.has(fid)}
                      />
                    );
                  })}
                </View>
              ))
            : filteredGroups.map((group) => (
                <View key={group.subjectId} style={styles.groupSection}>
                  <Text style={[styles.sectionTitle, { color: onSurface }]}>
                    {group.subjectName}
                  </Text>
                  {group.categories.map((cat: any) => (
                    <View key={cat.name} style={styles.categoryBlock}>
                      <View style={[styles.categoryHeader, { backgroundColor: brand.primary + "10" }]}>
                        <Icon name="book" size={16} color={brand.primary} />
                        <Text style={[styles.categoryName, { color: onSurface }]}>{cat.name}</Text>
                        <Text style={[styles.categoryCount, { color: onSurfaceVariant }]}>{cat.formulas.length}</Text>
                      </View>
                      <View>
                        {cat.formulas.map((f: any) => {
                          const fid = f.id || f.name || "";
                          return (
                            <WebFormulaCard
                              key={fid}
                              name={f.name}
                              latex={f.latex}
                              description={f.description}
                              onPress={() => handleFormulaPress(fid, group.subjectId, group.subjectName, cat.name)}
                              onToggleFavorite={() => toggleFavorite(fid)}
                              isFavorite={favorites.has(fid)}
                            />
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
        </View>
      ) : Platform.OS === "android" || Platform.OS === "ios" ? (
        <View style={styles.scrollContent}>
        {isSearching
          ? searchGroups.map((group) => (
              <View key={group.subjectId} style={styles.groupSection}>
                <Text style={[styles.sectionTitle, { color: brand.primary }]}>
                  {group.subjectName}
                </Text>
                <BatchFormulaRenderer
                  categories={[{ name: group.subjectName, formulas: group.formulas }]}
                  minHeight={48}
                  theme={formulaTheme}
                />
              </View>
            ))
          : filteredGroups.map((group) => (
              <View key={group.subjectId} style={styles.groupSection}>
                <Text style={[styles.sectionTitle, { color: onSurface }]}>
                  {group.subjectName}
                </Text>
                <BatchFormulaRenderer
                  categories={group.categories}
                  minHeight={48}
                  theme={formulaTheme}
                />
              </View>
            ))}
        </View>
      ) : null}
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

  scrollContent: {
    padding: 12,
    paddingBottom: 40,
    flexGrow: 1,
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

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  favoriteCard: {
    width: 160,
    padding: 12,
    borderRadius: SHAPE.lg,
    borderWidth: 1,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }),
  },
  favCardName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    paddingRight: 16,
  },
  favCardSubject: {
    fontSize: 11,
    fontWeight: "500",
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
  formulaCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
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

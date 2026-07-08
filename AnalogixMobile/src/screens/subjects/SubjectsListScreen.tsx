import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { Text, useTheme, ActivityIndicator, Searchbar, SegmentedButtons } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ME } from "../../graphql/queries/user";
import { SUBJECTS, CUSTOM_SUBJECTS } from "../../graphql/queries/subject";
import { useThemeContext } from "../../theme/ThemeContext";
import { ExpressiveCard, ExpressiveEmptyState, ExpressiveScreen, ExpressiveSection } from "../../components/expressive";
import Icon from "../../components/Icon";
import SubjectCustomizationSheet from "../../components/SubjectCustomizationSheet";
import { SUBJECT_CATALOG, mapSubjectIcon } from "../../shared/subjects/catalog";

export default function SubjectsListScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - 48) / 2;
  const { data: meData, loading: meLoading } = useQuery(ME);
  const { data: subjectsData, loading: subjectsLoading } = useQuery(SUBJECTS);
  const { data: customData } = useQuery(CUSTOM_SUBJECTS);
  const enrolledNames = (meData?.me?.subjects as string[] | undefined) ?? [];
  const [customizing, setCustomizing] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const SUBJECT_ALIASES: Record<string, string> = {
    maths: "math",
    bio: "biology",
    chem: "chemistry",
    phys: "physics",
    "comp sci": "computing",
    "information technology": "computing",
    "software design": "computing",
    "business studies": "business",
  };

  const resolveSubject = (name: string) => {
    const lower = name.toLowerCase();
    const aliasTarget = SUBJECT_ALIASES[lower];
    const searchName = aliasTarget ?? lower;
    const catalogEntry = SUBJECT_CATALOG.find(
      (c) => c.label.toLowerCase() === searchName || c.id.toLowerCase() === searchName
    );
    if (catalogEntry) return { id: catalogEntry.id, name: catalogEntry.label, icon: catalogEntry.icon, color: brand.primary, description: catalogEntry.description };
    return { id: name.toLowerCase().replace(/\s+/g, "-"), name: capitalize(name), icon: "book-open-variant", color: brand.primary, description: "" };
  };

  const customLookup = (id: string) => {
    const entry = (customData?.customSubjects ?? []).find((c: any) => c.subjectId === id);
    return entry ? { icon: mapSubjectIcon(entry.customIcon), color: entry.customColor, title: entry.customTitle } : {};
  };

  const allSubjects = enrolledNames
    .map((name) => resolveSubject(name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const subjects = useMemo(
    () => (search.trim() ? allSubjects.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase())) : allSubjects),
    [allSubjects, search]
  );

  if (meLoading || subjectsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ExpressiveScreen
      title="Subjects"
      subtitle={`${subjects.length} subject${subjects.length === 1 ? "" : "s"}`}
      leadingIcon="school"
    >
      {subjects.length > 0 && (
        <>
          <Searchbar placeholder="Search subjects" value={search} onChangeText={setSearch} style={{ marginHorizontal: 16, marginBottom: 12 }} />
          <SegmentedButtons
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "grid" | "list")}
            buttons={[
              { value: "grid", icon: "view-grid" },
              { value: "list", icon: "view-list" },
            ]}
            style={{ marginHorizontal: 16, marginBottom: 16 }}
          />
        </>
      )}

      <ExpressiveSection title="Your subjects">
        {viewMode === "grid" ? (
          <View style={styles.grid}>
            {subjects.length === 0 ? (
              <ExpressiveEmptyState icon="school-outline" title="No subjects yet" subtitle={search ? "No subjects match your search." : "Set your subjects in onboarding to see them here."} />
            ) : (
              subjects.map((s) => {
                const custom = customLookup(s.id);
                const displayName = custom.title || s.name;
                const displayIcon = custom.icon || s.icon || "book-open-variant";
                const displayColor = custom.color || paperTheme.colors.secondaryContainer;
                return (
                  <Pressable key={s.id} onLongPress={() => setCustomizing({ id: s.id, name: s.name })}>
                    <ExpressiveCard
                      onPress={() => navigation.navigate("SubjectDetail", { subjectId: s.id, name: displayName })}
                      style={[styles.card, { width: cardWidth }]}
                      tone="high"
                    >
                      <View style={styles.cardTop}>
                        <View style={[styles.iconWrap, { backgroundColor: displayColor }]}>
                          <Icon name={displayIcon} size={24} color={paperTheme.colors.onSecondaryContainer} />
                        </View>
                      </View>
                      <View style={{ flex: 1, justifyContent: "flex-end" }}>
                        <Text variant="titleMedium" numberOfLines={2} style={{ fontWeight: "900", color: paperTheme.colors.onSurface, marginTop: 14 }}>
                          {displayName}
                        </Text>
                        {s.description ? (
                          <Text variant="bodySmall" numberOfLines={2} style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 16 }}>
                            {s.description}
                          </Text>
                        ) : null}
                      </View>
                    </ExpressiveCard>
                  </Pressable>
                );
              })
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {subjects.length === 0 ? (
              <ExpressiveEmptyState icon="school-outline" title="No subjects yet" subtitle={search ? "No subjects match your search." : "Set your subjects in onboarding to see them here."} />
            ) : (
              subjects.map((s) => {
                const custom = customLookup(s.id);
                const displayName = custom.title || s.name;
                const displayIcon = custom.icon || s.icon || "book-open-variant";
                const displayColor = custom.color || paperTheme.colors.secondaryContainer;
                return (
                  <Pressable key={s.id} onLongPress={() => setCustomizing({ id: s.id, name: s.name })}>
                    <ExpressiveCard
                      onPress={() => navigation.navigate("SubjectDetail", { subjectId: s.id, name: displayName })}
                      tone="high"
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={[styles.iconWrap, { backgroundColor: displayColor }]}>
                          <Icon name={displayIcon} size={22} color={paperTheme.colors.onSecondaryContainer} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="titleSmall" numberOfLines={1} style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>{displayName}</Text>
                          {s.description ? (
                            <Text variant="bodySmall" numberOfLines={1} style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 2 }}>{s.description}</Text>
                          ) : null}
                        </View>
                      </View>
                    </ExpressiveCard>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ExpressiveSection>
      {customizing && (
        <SubjectCustomizationSheet
          visible={!!customizing}
          subjectId={customizing.id}
          subjectName={customizing.name}
          onDismiss={() => setCustomizing(null)}
        />
      )}
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 20, justifyContent: "space-between" },
  card: { minHeight: 160, justifyContent: "space-between" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconWrap: { width: 52, height: 52, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});

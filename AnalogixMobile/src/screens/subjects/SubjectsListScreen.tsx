import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, useTheme, ActivityIndicator, Searchbar } from "react-native-paper";
import { useQuery } from "@apollo/client/react";
import { useNavigation } from "@react-navigation/native";
import { ME } from "../../graphql/queries/user";
import { SUBJECTS, CUSTOM_SUBJECTS } from "../../graphql/queries/subject";
import { useThemeContext } from "../../theme/ThemeContext";
import { ExpressiveCard, ExpressiveEmptyState, ExpressiveScreen, ExpressiveSection } from "../../components/expressive";
import Icon from "../../components/Icon";
import SubjectCustomizationSheet from "../../components/SubjectCustomizationSheet";
import { SUBJECT_CATALOG, mapSubjectIcon } from "../../data/subjects";

export default function SubjectsListScreen() {
  const paperTheme = useTheme();
  const { theme } = useThemeContext();
  const navigation = useNavigation<any>();
  const { data: meData, loading: meLoading } = useQuery(ME);
  const { loading: subjectsLoading } = useQuery(SUBJECTS);
  const { data: customData } = useQuery(CUSTOM_SUBJECTS);
  const enrolledNames = (meData?.me?.subjects as string[] | undefined) ?? [];
  const [customizing, setCustomizing] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
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
    if (catalogEntry) return { id: catalogEntry.id, name: catalogEntry.label, icon: catalogEntry.icon, color: theme.colors.primary, description: catalogEntry.description };
    return { id: name.toLowerCase().replace(/\s+/g, "-"), name: capitalize(name), icon: "book-open-variant", color: theme.colors.primary, description: "" };
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
        <Searchbar placeholder="Search subjects" value={search} onChangeText={setSearch} style={{ marginHorizontal: 16, marginBottom: 12 }} />
      )}

      <ExpressiveSection title="Your subjects">
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

  iconWrap: { width: 52, height: 52, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});

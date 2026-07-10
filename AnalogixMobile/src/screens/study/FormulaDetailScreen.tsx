import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Share,
} from "react-native";
import { Text, useTheme, ActivityIndicator, Snackbar } from "react-native-paper";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ExpressiveScreen } from "../../components/expressive";
import FormulaRenderer from "../../components/FormulaRenderer";
import { FORMULA_SHEET_DATA } from "@analogix/shared/formulas";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

const FAVORITES_KEY = "formula_favorites";

export default function FormulaDetailScreen() {
  const route = useRoute<RouteProp<{ params: { formulaId: string; subjectId: string; subjectName: string; categoryName: string } }, "params">>();
  const navigation = useNavigation<any>();
  const paperTheme = useTheme();
  const { formulaId, subjectId, subjectName, categoryName } = route.params;

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [loading, setLoading] = useState(true);

  const formula = useMemo(() => {
    const sheet = FORMULA_SHEET_DATA.find((s) => s.subjectId === subjectId);
    if (!sheet) return null;
    for (const cat of sheet.categories) {
      const f = cat.formulas.find((f: any) => f.id === formulaId || f.name === formulaId);
      if (f) return { ...f, category: cat.name };
    }
    return null;
  }, [subjectId, formulaId]);

  const relatedFormulas = useMemo(() => {
    if (!formula) return [];
    const sheet = FORMULA_SHEET_DATA.find((s) => s.subjectId === subjectId);
    if (!sheet) return [];
    const cat = sheet.categories.find((c) => c.name === (formula as any).category);
    if (!cat) return [];
    return cat.formulas.filter((f: any) => (f.id || f.name) !== formulaId).slice(0, 6);
  }, [formula, subjectId, formulaId]);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then((v) => {
      if (v) setFavorites(new Set(JSON.parse(v)));
      setLoading(false);
    });
  }, []);

  const toggleFavorite = useCallback(async () => {
    const id = (formula as any)?.id || (formula as any)?.name || "";
    if (!id) return;
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavorites(next);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
    setSnackbarMsg(next.has(id) ? "Added to favorites" : "Removed from favorites");
    setShowSnackbar(true);
  }, [favorites, formula]);

  const handleShare = useCallback(async () => {
    if (!formula) return;
    const msg = `${(formula as any).name}: ${(formula as any).latex}`;
    try {
      await Share.share({ message: msg });
    } catch {}
  }, [formula]);

  const isFav = formula ? favorites.has((formula as any).id || (formula as any).name || "") : false;

  if (loading) {
    return (
      <ExpressiveScreen title="Formula" eyebrow="Loading..." leadingIcon="sigma" onBack={() => navigation.goBack()}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </ExpressiveScreen>
    );
  }

  if (!formula) {
    return (
      <ExpressiveScreen title="Not Found" eyebrow="Error" leadingIcon="sigma" onBack={() => navigation.goBack()}>
        <Text style={{ textAlign: "center", marginTop: 40, color: paperTheme.colors.onSurfaceVariant }}>Formula not found.</Text>
      </ExpressiveScreen>
    );
  }

  const tags = (formula as any).tags || [];
  const description = (formula as any).description || "";

  return (
    <ExpressiveScreen title={(formula as any).name} eyebrow={`${subjectName} · ${(formula as any).category}`} leadingIcon="sigma" onBack={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outlineVariant }]}>
          <View style={styles.formulaDisplay}>
            <FormulaRenderer math={(formula as any).latex} minHeight={60} />
          </View>

          {description ? (
            <Text style={[styles.description, { color: paperTheme.colors.onSurfaceVariant }]}>{description}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable onPress={toggleFavorite} style={[styles.actionBtn, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <Icon name={isFav ? "star" : "star-outline"} size={18} color={isFav ? "#F59E0B" : paperTheme.colors.onSurfaceVariant} />
              <Text style={[styles.actionText, { color: paperTheme.colors.onSurfaceVariant }]}>{isFav ? "Saved" : "Save"}</Text>
            </Pressable>
            <Pressable onPress={handleShare} style={[styles.actionBtn, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <Icon name="share-variant" size={18} color={paperTheme.colors.onSurfaceVariant} />
              <Text style={[styles.actionText, { color: paperTheme.colors.onSurfaceVariant }]}>Share</Text>
            </Pressable>
          </View>
        </View>

        {tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Tags</Text>
            <View style={styles.tagsRow}>
              {tags.map((tag: string) => (
                <View key={tag} style={[styles.tag, { backgroundColor: paperTheme.colors.surfaceVariant, borderColor: paperTheme.colors.outlineVariant }]}>
                  <Text style={[styles.tagText, { color: paperTheme.colors.onSurfaceVariant }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.metaSection}>
          <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Details</Text>
          <View style={[styles.metaCard, { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outlineVariant }]}>
            <MetaRow label="Subject" value={subjectName} icon="book" color={paperTheme.colors.primary} />
            <MetaRow label="Category" value={(formula as any).category} icon="tag" color={paperTheme.colors.primary} />
            <MetaRow label="Topic" value={(formula as any).topic || (formula as any).category} icon="shape" color={paperTheme.colors.primary} />
          </View>
        </View>

        {relatedFormulas.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={[styles.sectionLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Related Formulas</Text>
            {relatedFormulas.map((f: any) => (
              <Pressable
                key={f.id || f.name}
                onPress={() => navigation.replace("FormulaDetail", { formulaId: f.id || f.name, subjectId, subjectName, categoryName: (formula as any).category })}
              >
                <View style={[styles.relatedCard, { backgroundColor: paperTheme.colors.surface, borderColor: paperTheme.colors.outlineVariant }]}>
                  <Text style={[styles.relatedName, { color: paperTheme.colors.onSurface }]}>{f.name}</Text>
                  <Text style={[styles.relatedLatex, { color: paperTheme.colors.onSurfaceVariant }]} numberOfLines={1}>{f.latex}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {Platform.OS !== "web" && (
        <Snackbar visible={showSnackbar} onDismiss={() => setShowSnackbar(false)} duration={2000}>
          {snackbarMsg}
        </Snackbar>
      )}
    </ExpressiveScreen>
  );
}

function MetaRow({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Icon name={icon} size={16} color={color} />
      <Text style={[styles.metaLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.onSurface }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: SHAPE.lg,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 } }),
  },
  formulaDisplay: { padding: 20, alignItems: "center" },
  description: { fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 16 },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
    paddingTop: 14,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: SHAPE.pill,
  },
  actionText: { fontSize: 13, fontWeight: "600" },
  tagsSection: { marginTop: 20 },
  sectionLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SHAPE.pill,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: "500" },
  metaSection: { marginTop: 20 },
  metaCard: { borderRadius: SHAPE.lg, borderWidth: 1, overflow: "hidden" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  metaLabel: { fontSize: 13, fontWeight: "500", width: 72 },
  metaValue: { fontSize: 13, fontWeight: "600", flex: 1 },
  relatedSection: { marginTop: 24 },
  relatedCard: {
    borderRadius: SHAPE.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  relatedName: { fontSize: 14, fontWeight: "600" },
  relatedLatex: { fontSize: 12, marginTop: 2 },
});

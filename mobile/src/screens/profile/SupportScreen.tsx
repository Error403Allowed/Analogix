import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Card, IconButton } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

const FAQS = [
  { q: "How do I reset my streak?", a: "Streaks auto-reset after 48 hours of inactivity." },
  { q: "Can I use Analogix offline?", a: "Caching keeps recent content available; chat needs a connection." },
  { q: "How do I share a flashcard deck?", a: "Open the deck, tap the share icon, and choose an option." },
  { q: "Is my data private?", a: "Yes — your data is yours. See Privacy for details." },
];

export default function SupportScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Card mode="elevated" style={[styles.contactCard, { borderLeftColor: paperTheme.colors.primary, borderLeftWidth: 4 }]}>
          <Card.Content>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Icon name="email-fast-outline" size={24} color={paperTheme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>Need a hand?</Text>
                <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                  Reach us at support@analogix.app \u2014 we usually reply within 24 hours.
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Text variant="titleSmall" style={[styles.faqLabel, { color: paperTheme.colors.onSurfaceVariant }]}>FAQ</Text>
        {FAQS.map((f, i) => (
          <Card key={f.q} mode="outlined" style={styles.faqCard}>
            <Pressable onPress={() => setOpenIdx(openIdx === i ? null : i)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <Card.Content>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface, flex: 1 }}>{f.q}</Text>
                  <Text style={{ color: paperTheme.colors.onSurfaceVariant, fontSize: 16 }}>{openIdx === i ? "-" : "+"}</Text>
                </View>
                {openIdx === i && (
                  <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 12 }}>
                    {f.a}
                  </Text>
                )}
              </Card.Content>
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 100, gap: 12 },
  contactCard: { borderRadius: SHAPE.lg },
  faqLabel: { fontWeight: "700", letterSpacing: 1, marginTop: 8 },
  faqCard: { borderRadius: SHAPE.lg },
});

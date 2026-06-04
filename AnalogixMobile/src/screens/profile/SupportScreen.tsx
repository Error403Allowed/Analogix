/**
 * Support — FAQ, contact, report a bug.
 */
import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, IconButton, List } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
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
  const { brand } = useThemeContext();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineLarge" style={styles.title}>Support</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={[styles.contactCard, { backgroundColor: brand.primary, borderRadius: SHAPE.xl }]}>
          <Icon name="email-fast-outline" size={28} color="#fff" />
          <Text variant="titleMedium" style={styles.contactTitle}>Need a hand?</Text>
          <Text variant="bodyMedium" style={styles.contactBody}>
            Reach us at support@analogix.app — we usually reply within 24 hours.
          </Text>
        </View>

        <List.Section>
          <List.Subheader style={{ paddingLeft: 0 }}>FAQ</List.Subheader>
          {FAQS.map((f) => (
            <List.Accordion key={f.q} title={f.q} id={f.q} left={(p) => <List.Icon {...p} icon="help-circle" />}>
              <Text variant="bodyMedium" style={styles.faqAnswer}>{f.a}</Text>
            </List.Accordion>
          ))}
        </List.Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 8 },
  title: { fontWeight: "900" },
  list: { padding: 20, paddingBottom: 100 },
  contactCard: { padding: 20, marginBottom: 16, gap: 8 },
  contactTitle: { color: "#fff", fontWeight: "900" },
  contactBody: { color: "rgba(255,255,255,0.85)" },
  faqAnswer: { paddingHorizontal: 16, paddingBottom: 12 },
});

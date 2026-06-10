import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, IconButton } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { SHAPE } from "../../theme/tokens";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using Analogix (\u201cthe App\u201d), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.",
  },
  {
    title: "2. Description of Service",
    body: "Analogix is an AI-powered study companion that provides tutoring, flashcards, quizzes, calendar scheduling, and other educational tools. The App is designed for personal, non-commercial educational use.",
  },
  {
    title: "3. Eligibility",
    body: "You must be at least 13 years old to use Analogix. By using the App, you represent that you meet this age requirement. If you are under 18, you must have parental or guardian consent.",
  },
  {
    title: "4. Account Registration",
    body: "You sign in via Google OAuth. You are responsible for maintaining the security of your account. Do not share your credentials. Notify us immediately if you suspect unauthorised access.",
  },
  {
    title: "5. Acceptable Use",
    body: "You agree not to:\n\u2022 Use the App for any unlawful purpose\n\u2022 Attempt to reverse-engineer or exploit the App\u2019s code or infrastructure\n\u2022 Upload malicious content or interfere with the App\u2019s operations\n\u2022 Use automated tools to scrape or extract data from the App\n\u2022 Impersonate another person or misrepresent your identity",
  },
  {
    title: "6. Intellectual Property",
    body: "All content, design, graphics, and code in Analogix are owned by or licensed to Analogix. You may not copy, modify, distribute, or sell any part of the App without our written permission.",
  },
  {
    title: "7. User-Generated Content",
    body: "You retain ownership of content you create in the App (notes, flashcards, chat messages). By using the App, you grant Analogix a limited licence to process this content solely to provide and improve the service.",
  },
  {
    title: "8. AI-Generated Content",
    body: "The App uses artificial intelligence to generate study materials, quizzes, and responses. AI-generated content may contain errors. Always verify critical information with authoritative sources. AI outputs are not a substitute for professional academic advice.",
  },
  {
    title: "9. Subscription and Payments",
    body: "Analogix may offer free and paid features. Paid features require a valid payment method. Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Refunds are handled in accordance with applicable law.",
  },
  {
    title: "10. Data and Privacy",
    body: "Your use of the App is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information. By using the App, you consent to the practices described in the Privacy Policy.",
  },
  {
    title: "11. Disclaimer of Warranties",
    body: "The App is provided \u201cas is\u201d and \u201cas available\u201d without warranties of any kind, either express or implied. We do not warrant that the App will be uninterrupted, error-free, or free of harmful components.",
  },
  {
    title: "12. Limitation of Liability",
    body: "To the maximum extent permitted by law, Analogix shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.",
  },
  {
    title: "13. Termination",
    body: "We may suspend or terminate your access to the App at any time, with or without cause, with or without notice. You may also terminate your account at any time by contacting us.",
  },
  {
    title: "14. Changes to Terms",
    body: "We may update these Terms from time to time. Material changes will be communicated through the App or by email. Continued use after changes constitutes acceptance of the new Terms.",
  },
  {
    title: "15. Governing Law",
    body: "These Terms are governed by the laws of New South Wales, Australia. Any disputes shall be resolved in the courts of New South Wales.",
  },
  {
    title: "16. Contact",
    body: "Questions about these Terms? Email us at support@analogix.app.",
  },
];

export default function TermsScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Terms of Service</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodySmall" style={[styles.date, { color: paperTheme.colors.onSurfaceVariant }]}>
          Last updated: 9 June 2026
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>
              {s.title}
            </Text>
            <Text variant="bodyMedium" style={[styles.sectionBody, { color: paperTheme.colors.onSurfaceVariant }]}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  content: { padding: 20, paddingBottom: 100 },
  date: { marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontWeight: "700", marginBottom: 6 },
  sectionBody: { lineHeight: 22 },
});

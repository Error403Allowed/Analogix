import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, IconButton } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { SHAPE } from "../../theme/tokens";

const SECTIONS = [
  {
    title: "1. Introduction",
    body: "Analogix (\u201cthe App\u201d) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.",
  },
  {
    title: "2. Information We Collect",
    body: "We collect the following types of information:\n\nAccount Information: Your name, email address, and profile picture as provided by Google OAuth.\n\nStudy Data: Subjects, flashcards, quiz results, calendar events, chat conversations, and other content you create within the App.\n\nUsage Data: Pages viewed, features used, session duration, and interaction patterns within the App.\n\nDevice Information: Device type, operating system, app version, and unique device identifiers.",
  },
  {
    title: "3. How We Use Your Information",
    body: "We use your information to:\n\u2022 Provide and personalise the App\u2019s features\n\u2022 Power AI-driven study tools (tutoring, quiz generation, flashcard recommendations)\n\u2022 Track your learning progress and display it in dashboards\n\u2022 Improve the App\u2019s functionality and user experience\n\u2022 Communicate with you about updates, features, or support\n\u2022 Ensure the security and integrity of the App",
  },
  {
    title: "4. AI and Your Data",
    body: "Your study data (chat messages, flashcards, notes) is processed by our AI systems to generate personalised study materials. This processing occurs on our servers and is not used to train third-party AI models. You can delete your data at any time from the App\u2019s settings.",
  },
  {
    title: "5. Data Sharing",
    body: "We do not sell your personal information. We may share your data only:\n\u2022 With your explicit consent\n\u2022 To comply with legal obligations\n\u2022 To protect the rights and safety of Analogix and its users\n\u2022 With service providers who assist in operating the App (e.g., cloud hosting, analytics), under strict data processing agreements",
  },
  {
    title: "6. Data Storage and Security",
    body: "Your data is stored on secure cloud servers provided by Supabase. We implement industry-standard encryption (TLS in transit, AES-256 at rest) and access controls. While we take reasonable measures to protect your data, no method of transmission or storage is 100% secure.",
  },
  {
    title: "7. Data Retention",
    body: "We retain your data for as long as your account is active or as needed to provide the App\u2019s services. If you delete your account, we will remove your personal data within 30 days, except where required by law.",
  },
  {
    title: "8. Your Rights",
    body: "You have the right to:\n\u2022 Access the personal data we hold about you\n\u2022 Request correction of inaccurate data\n\u2022 Request deletion of your data\n\u2022 Export your data in a portable format\n\u2022 Opt out of non-essential data collection (analytics, crash reports)\n\nTo exercise these rights, use the settings in the App or contact us at support@analogix.app.",
  },
  {
    title: "9. Children\u2019s Privacy",
    body: "Analogix is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will delete it promptly.",
  },
  {
    title: "10. Third-Party Services",
    body: "The App uses the following third-party services:\n\u2022 Google OAuth for authentication\n\u2022 Supabase for database and authentication infrastructure\n\u2022 Groq for AI processing\n\nEach third-party service has its own privacy policy. We encourage you to review them.",
  },
  {
    title: "11. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. Material changes will be communicated through the App or by email. The \u201clast updated\u201d date at the top reflects the most recent revision.",
  },
  {
    title: "12. Contact Us",
    body: "If you have questions about this Privacy Policy or our data practices, contact us at:\n\nEmail: support@analogix.app",
  },
];

export default function PrivacyPolicyScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Privacy Policy</Text>
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

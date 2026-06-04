/**
 * Privacy — policy summary + toggles.
 */
import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, IconButton, List, Switch } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { SHAPE } from "../../theme/tokens";

export default function PrivacyScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation();
  const [analytics, setAnalytics] = useState(true);
  const [personalization, setPersonalization] = useState(true);
  const [crash, setCrash] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineLarge" style={styles.title}>Privacy</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 16 }}>
          Your data is yours. We never sell it. Adjust what you share below.
        </Text>
        <List.Section>
          <List.Item
            title="Analytics"
            description="Help us improve Analogix"
            right={() => <Switch value={analytics} onValueChange={setAnalytics} />}
          />
          <List.Item
            title="Personalization"
            description="Use your study data to tailor the AI"
            right={() => <Switch value={personalization} onValueChange={setPersonalization} />}
          />
          <List.Item
            title="Crash reports"
            description="Auto-send crash info on next launch"
            right={() => <Switch value={crash} onValueChange={setCrash} />}
          />
        </List.Section>
        <List.Item
          title="Read full privacy policy"
          left={() => <List.Icon icon="file-document" />}
          right={() => <List.Icon icon="chevron-right" />}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 8 },
  title: { fontWeight: "900" },
  list: { padding: 20, paddingBottom: 100 },
});

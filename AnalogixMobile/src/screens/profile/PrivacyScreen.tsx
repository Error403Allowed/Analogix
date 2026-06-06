import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, Card, IconButton, Switch } from "react-native-paper";
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
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Privacy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 16 }}>
          Your data is yours. We never sell it. Adjust what you share below.
        </Text>
        <Card mode="outlined" style={styles.card}>
          <PrivacySwitch label="Analytics" desc="Help us improve Analogix" value={analytics} onToggle={setAnalytics} />
          <View style={[styles.divider, { backgroundColor: paperTheme.colors.outlineVariant }]} />
          <PrivacySwitch label="Personalization" desc="Use your study data to tailor the AI" value={personalization} onToggle={setPersonalization} />
          <View style={[styles.divider, { backgroundColor: paperTheme.colors.outlineVariant }]} />
          <PrivacySwitch label="Crash reports" desc="Auto-send crash info on next launch" value={crash} onToggle={setCrash} />
        </Card>
      </ScrollView>
    </View>
  );
}

function PrivacySwitch({ label, desc, value, onToggle }: { label: string; desc: string; value: boolean; onToggle: (v: boolean) => void }) {
  const paperTheme = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{label}</Text>
        <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 100 },
  card: { borderRadius: SHAPE.lg, overflow: "hidden" },
  divider: { height: 1, marginHorizontal: 16 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
});

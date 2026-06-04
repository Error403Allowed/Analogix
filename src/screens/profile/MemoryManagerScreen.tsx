import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, IconButton, Button, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { USER_STATS, FORGET_MEMORY } from "../../graphql/queries/user";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";

export default function MemoryManagerScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation();
  const { data, loading } = useQuery(USER_STATS);
  const [forgetMemory] = useMutation(FORGET_MEMORY, {
    refetchQueries: [{ query: USER_STATS }],
  });
  const memories = data?.userStats?.memories ?? [];

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineLarge" style={styles.title}>Memory</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 16 }}>
          Things the AI has learned about you. Clear any you'd rather it forget.
        </Text>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : memories.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}>
              No memories yet. Chat with the AI and it will remember your preferences.
            </Text>
          </View>
        ) : (
          memories.map((m: any) => (
            <View key={m.id} style={[styles.row, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: "800" }}>{m.key}</Text>
                <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>{m.value}</Text>
              </View>
              <Button
                compact
                textColor={paperTheme.colors.error}
                onPress={() => forgetMemory({ variables: { id: m.id } })}
              >
                Forget
              </Button>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 8 },
  title: { fontWeight: "900" },
  list: { padding: 20, paddingBottom: 100 },
  empty: { alignItems: "center", paddingTop: 80 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, marginBottom: 8 },
});

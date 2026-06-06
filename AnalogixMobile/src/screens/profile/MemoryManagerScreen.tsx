import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Card, IconButton, Button, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { USER_STATS, FORGET_MEMORY } from "../../graphql/queries/user";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

export default function MemoryManagerScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation();
  const { data, loading } = useQuery(USER_STATS);
  const [forgetMemory] = useMutation(FORGET_MEMORY, { refetchQueries: [{ query: USER_STATS }] });
  const memories = data?.userStats?.memories ?? [];

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Memory</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 16, paddingHorizontal: 4 }}>
          Things the AI has learned about you. Clear any you'd rather it forget.
        </Text>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : memories.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="brain" size={64} color={paperTheme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 16 }}>
              No memories yet. Chat with the AI and it will remember your preferences.
            </Text>
          </View>
        ) : (
          memories.map((m: any) => (
            <Card key={m.id} mode="outlined" style={styles.memoryCard}>
              <Card.Content style={styles.memoryRow}>
                <View style={[styles.iconWrap, { backgroundColor: brand.primary + "18" }]}>
                  <Icon name="brain" size={20} color={brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{m.key}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{m.value}</Text>
                </View>
                <Button compact textColor={paperTheme.colors.error} onPress={() => forgetMemory({ variables: { id: m.id } })}>
                  Forget
                </Button>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 100, gap: 8 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  memoryCard: { borderRadius: SHAPE.lg },
  memoryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: SHAPE.md, alignItems: "center", justifyContent: "center" },
});

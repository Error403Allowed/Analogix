/**
 * Rooms list — collaborative study rooms. Live member count via subscription.
 */
import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, IconButton, ActivityIndicator, FAB } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ROOMS } from "../../graphql/queries/room";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize } from "../../hooks/useResponsive";
import Icon from "../../components/Icon";

export default function RoomsListScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const size = useScreenSize();
  const isCompact = size === "compact";
  const { data, loading } = useQuery(ROOMS);
  const rooms = data?.rooms ?? [];

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.header, { paddingTop: isCompact ? 40 : 56 }]}>
        <Text variant={isCompact ? "headlineMedium" : "headlineLarge"} style={styles.title}>Rooms</Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
          Study together in real time.
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : rooms.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="account-group" size={64} color={paperTheme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 16 }}>
              No rooms yet. Create one to invite friends.
            </Text>
          </View>
        ) : (
          rooms.map((r: any) => (
            <Pressable
              key={r.id}
              onPress={() => navigation.navigate("RoomDetail", { roomId: r.id, name: r.name })}
            >
              <View style={[styles.row, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
                <View style={[styles.iconWrap, { backgroundColor: `${brand.primary}22` }]}>
                  <Icon name="account-group" size={20} color={brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ fontWeight: "800" }}>{r.name}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                    {r.members?.length ?? 0} members · {r.subject ?? "General"}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={paperTheme.colors.onSurfaceVariant} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      <FAB
        icon="plus"
        label="New room"
        style={[styles.fab, { backgroundColor: brand.primary }]}
        color="#fff"
        onPress={() => {
          // TODO: open new-room sheet
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontWeight: "900" },
  list: { padding: 16, paddingBottom: 120, gap: 8 },
  empty: { alignItems: "center", paddingTop: 80 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, marginBottom: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: 16, bottom: 100 },
});

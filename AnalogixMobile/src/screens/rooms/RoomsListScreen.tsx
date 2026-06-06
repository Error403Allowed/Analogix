import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, FAB, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ROOMS } from "../../graphql/queries/room";
import { SHAPE } from "../../theme/tokens";
import {
  ExpressiveEmptyState,
  ExpressiveHeroPanel,
  ExpressiveListRow,
  ExpressiveScreen,
  ExpressiveSection,
} from "../../components/expressive";

export default function RoomsListScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation<any>();
  const { data, loading } = useQuery(ROOMS);
  const rooms = data?.rooms ?? [];

  return (
    <ExpressiveScreen title="Rooms" subtitle="Study together in real time" leadingIcon="account-group" fab={
      <FAB icon="plus" label="New room" color={paperTheme.colors.onPrimary} style={{ backgroundColor: paperTheme.colors.primary, borderRadius: SHAPE.lg }} onPress={() => {}} />
    }>
      <ExpressiveHeroPanel accent="secondary" style={styles.hero}>
        <Text variant="headlineSmall" style={{ color: paperTheme.colors.onSecondaryContainer, fontWeight: "900" }}>
          Shared focus, shared notes.
        </Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSecondaryContainer }}>
          Create a room for group chat, documents, and timers.
        </Text>
      </ExpressiveHeroPanel>
      <ExpressiveSection title="Upcoming rooms">
        <View style={styles.list}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : rooms.length === 0 ? (
          <ExpressiveEmptyState icon="account-group" title="No rooms yet" subtitle="Create one to invite friends." />
        ) : (
          rooms.map((r: any) => (
            <ExpressiveListRow
              key={r.id}
              title={r.name}
              subtitle={`${r.members?.length ?? 0} members · ${r.subject ?? "General"}`}
              icon="account-group"
              onPress={() => navigation.navigate("RoomDetail", { roomId: r.id, name: r.name })}
            />
          ))
        )}
        </View>
      </ExpressiveSection>

    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { minHeight: 170, gap: 8, justifyContent: "center" },
  list: { gap: 8 },
});

import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, Card, IconButton, Button } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { EVENTS } from "../../graphql/queries/calendar";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";

export default function EventDetailScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { eventId } = route.params;
  const { data, loading } = useQuery(EVENTS, { variables: { id: eventId } });

  const event = data?.event;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Event</Text>
      </View>

      <View style={styles.content}>
        <Card mode="elevated" style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>
              {event?.name ?? event?.title ?? "Event"}
            </Text>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 8 }}>
              {event?.date ?? event?.start ? new Date(event.date ?? event.start).toLocaleDateString() : "No date"}
            </Text>
            {event?.description && (
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurface, marginTop: 12 }}>
                {event.description}
              </Text>
            )}
          </Card.Content>
        </Card>

        <Button mode="contained" buttonColor={brand.primary} style={{ borderRadius: SHAPE.lg, marginTop: 16 }} contentStyle={{ height: 48 }}>
          Edit
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  content: { flex: 1, padding: 16, gap: 8 },
  card: { borderRadius: SHAPE.lg },
});

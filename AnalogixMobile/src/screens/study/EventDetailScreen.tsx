import React, { useState } from "react";
import { View, StyleSheet, Alert, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Card, IconButton, Button, Portal, Modal, TextInput } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { EVENTS, DELETE_EVENT, UPDATE_EVENT } from "../../graphql/queries/calendar";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";

const EVENT_TYPES = ["exam", "assignment", "event", "class", "lesson", "reminder", "sport", "meeting", "personal"];

export default function EventDetailScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { eventId } = route.params;
  const now = new Date();
  const from = new Date(now.getFullYear() - 1, 0, 1);
  const to = new Date(now.getFullYear() + 1, 11, 31);
  const { data, loading } = useQuery(EVENTS, {
    variables: { from: from.toISOString(), to: to.toISOString() },
  });
  const [deleteEvent] = useMutation(DELETE_EVENT);
  const [updateEvent, { loading: saving }] = useMutation(UPDATE_EVENT);

  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState("event");
  const [editDescription, setEditDescription] = useState("");

  const events = data?.events ?? [];
  const event = events.find((e: any) => e.id === eventId);

  const openEdit = () => {
    if (!event) return;
    setEditTitle(event.title ?? "");
    setEditDate(event.date?.split("T")[0] ?? "");
    setEditType(event.type ?? "event");
    setEditDescription(event.description ?? "");
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    try {
      await updateEvent({
        variables: {
          id: eventId,
          input: {
            title: editTitle.trim(),
            date: editDate,
            type: editType,
            description: editDescription.trim() || undefined,
          },
        },
        refetchQueries: ["Events"],
      });
      setShowEdit(false);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not update event.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent({ variables: { id: eventId }, refetchQueries: ["Events"] });
            navigation.goBack();
          } catch (err) {
            console.error("Failed to delete event:", err);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant }}>Event not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Event</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card mode="elevated" style={styles.card}>
          <Card.Content>
            <View style={[styles.typeBar, { backgroundColor: event.color ?? brand.primary }]} />
            <Text variant="labelSmall" style={{ color: event.color ?? brand.primary, fontWeight: "700", textTransform: "uppercase", marginTop: 8 }}>
              {event.type}
            </Text>
            <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginTop: 4 }}>
              {event.title}
            </Text>
            {event.subject && (
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
                {event.subject}
              </Text>
            )}
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 8 }}>
              {new Date(event.date).toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {event.endDate && ` — ${new Date(event.endDate).toLocaleDateString()}`}
            </Text>
            {event.location && (
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
                {event.location}
              </Text>
            )}
            {event.description && (
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurface, marginTop: 12 }}>
                {event.description}
              </Text>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          buttonColor={brand.primary}
          style={{ borderRadius: SHAPE.lg, marginTop: 16 }}
          contentStyle={{ height: 48 }}
          onPress={openEdit}
        >
          Edit
        </Button>

        <Button
          mode="outlined"
          textColor={paperTheme.colors.error}
          style={{ borderRadius: SHAPE.lg, marginTop: 8, borderColor: paperTheme.colors.error }}
          contentStyle={{ height: 48 }}
          onPress={handleDelete}
        >
          Delete
        </Button>
      </ScrollView>

      <Portal>
        <Modal visible={showEdit} onDismiss={() => setShowEdit(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Edit event</Text>
          <TextInput mode="outlined" label="Title" value={editTitle} onChangeText={setEditTitle} style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Date" value={editDate} onChangeText={setEditDate} style={{ marginBottom: 12 }} />
          <TextInput mode="outlined" label="Description" value={editDescription} onChangeText={setEditDescription} multiline style={{ marginBottom: 12 }} />
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 8 }}>Type</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {EVENT_TYPES.map((t) => (
              <Pressable key={t} onPress={() => setEditType(t)}
                style={[styles.typeChip, { backgroundColor: editType === t ? brand.primary : paperTheme.colors.surfaceVariant }]}>
                <Text style={{ color: editType === t ? "#fff" : paperTheme.colors.onSurface, fontWeight: "700", fontSize: 12 }}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Button mode="contained" buttonColor={brand.primary} loading={saving} onPress={handleSave} disabled={!editTitle.trim()}>
            Save
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  content: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: SHAPE.lg },
  typeBar: { width: 4, height: 40, borderRadius: 2 },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },
  typeChip: { borderRadius: SHAPE.pill, paddingHorizontal: 12, paddingVertical: 6 },
});

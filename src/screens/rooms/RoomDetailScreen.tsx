/**
 * Room detail — chat + canvas + documents, with subscription for live messages.
 */
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, FlatList } from "react-native";
import { Text, useTheme, IconButton, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { ROOM_DETAIL, ROOM_MESSAGES_SUB, SEND_ROOM_MESSAGE } from "../../graphql/queries/room";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

export default function RoomDetailScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { roomId, name } = route.params;
  const { data, loading, refetch } = useQuery(ROOM_DETAIL, { variables: { id: roomId } });
  const [sendMessage, { loading: sending }] = useMutation(SEND_ROOM_MESSAGE);
  const [text, setText] = useState("");

  // Subscribe to new messages in this room
  useSubscription(ROOM_MESSAGES_SUB, {
    variables: { roomId },
    onData: () => refetch(),
  });

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} />;

  const room = data?.room;
  const messages = room?.messages ?? [];
  const members = room?.members ?? [];
  const docs = room?.documents ?? [];

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setText("");
    try {
      await sendMessage({ variables: { roomId, content } });
    } catch (e) {
      // restore text on error
      setText(content);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: paperTheme.colors.background }]}
    >
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>Room</Text>
          <Text variant="titleLarge" style={{ fontWeight: "800" }}>{name}</Text>
        </View>
        <View style={styles.avatarRow}>
          {members.slice(0, 3).map((m: any) => (
            <View key={m.id} style={[styles.avatar, { backgroundColor: brand.tertiary }]}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>{(m.user?.name ?? "?").charAt(0).toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.chat}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="message-text-outline" size={48} color={paperTheme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 12 }}>
              Say hi to start the conversation.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
            <Text variant="labelSmall" style={{ color: brand.primary, fontWeight: "800" }}>
              {item.user?.name ?? "User"}
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 2 }}>{item.text ?? item.content}</Text>
          </View>
        )}
      />

      {docs.length > 0 && (
        <View style={[styles.docs, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="labelMedium" style={{ fontWeight: "800", marginBottom: 4 }}>Shared docs</Text>
          {docs.map((d: any) => (
            <Text key={d.id} variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
              · {d.title}
            </Text>
          ))}
        </View>
      )}

      <View style={[styles.composer, { backgroundColor: paperTheme.colors.surface }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          placeholderTextColor={paperTheme.colors.onSurfaceVariant}
          style={[styles.input, { color: paperTheme.colors.onSurface, borderRadius: SHAPE.xl }]}
        />
        <IconButton
          icon="send"
          iconColor="#fff"
          containerColor={brand.primary}
          size={20}
          onPress={handleSend}
          disabled={sending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 8, gap: 8 },
  avatarRow: { flexDirection: "row" },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginLeft: -8, borderWidth: 2, borderColor: "#fff" },
  chat: { padding: 20, paddingBottom: 12, gap: 8 },
  empty: { alignItems: "center", paddingTop: 60 },
  bubble: { padding: 12, maxWidth: "85%", alignSelf: "flex-start" },
  docs: { padding: 12, marginHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  composer: { flexDirection: "row", alignItems: "center", padding: 8, gap: 8, paddingBottom: 100 },
  input: { flex: 1, backgroundColor: "rgba(0,0,0,0.05)", paddingHorizontal: 16, paddingVertical: 10, fontSize: 16 },
});
